import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, Sparkles, X, Send, Trash2, SlidersHorizontal, AlertCircle, 
  ExternalLink, Copy, Check, ChevronDown, RefreshCw, Boxes, DollarSign, 
  Building2, FileText, ArrowRight
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/Button';
import { RexAILogo } from './RexAILogo';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const QUICK_PROMPTS = [
  { label: '🛒 Item Purchase Prices', query: 'What is the purchase price (unitCost) of EN8 round bar and other raw materials?' },
  { label: '📦 Low Stock Raw Materials', query: 'Which inventory items are currently at or below reorder level?' },
  { label: '⚙️ Active Work Orders', query: 'Show active production work orders and pending machine operations.' },
  { label: '💰 Customer Overdue Invoices', query: 'Which customers have unpaid or overdue invoices and what are the totals?' },
  { label: '🏦 Bank & Cash Balances', query: 'Show current balances in Commercial Bank, Cash in Hand, and revenue overview.' },
  { label: '📑 Quotations & Approvals', query: 'Show recent quotations and their approval status.' },
  { label: '🔍 QC Inspections & Defects', query: 'Show recent QC inspection results, rework logs, and defect reasons.' },
  { label: '🏭 Machineries & Status', query: 'Show CNC, Lathe, and Milling machines status and hourly rates.' }
];

const renderFormattedMessage = (content: string) => {
  const formatInline = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-zinc-950 dark:text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700/80 font-mono text-[11px] text-rose-600 dark:text-rose-400 border border-zinc-200 dark:border-zinc-600 font-semibold">$1</code>');
  };

  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 text-xs text-zinc-800 dark:text-zinc-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }
        if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          const headerText = trimmed.replace(/^#+\s*/, '');
          return (
            <h4 key={idx} className="font-bold text-xs text-zinc-950 dark:text-white pt-1">
              {headerText}
            </h4>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 leading-relaxed">
              <span className="text-rose-600 font-bold shrink-0 mt-0.5">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(trimmed.substring(2)) }} />
            </div>
          );
        }
        // Table row support
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          const cells = trimmed.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
          if (cells.every(c => c.trim().match(/^-+$/))) {
            return null;
          }
          return (
            <div key={idx} className="grid grid-flow-col auto-cols-fr gap-2 py-0.5 px-2 bg-zinc-100/70 dark:bg-zinc-900/60 rounded text-[11px] font-mono border-b border-zinc-200 dark:border-zinc-700/50">
              {cells.map((c, cIdx) => (
                <span key={cIdx} className="truncate" dangerouslySetInnerHTML={{ __html: formatInline(c.trim()) }} />
              ))}
            </div>
          );
        }
        return (
          <p 
            key={idx} 
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatInline(line) }}
          />
        );
      })}
    </div>
  );
};

export const RexAIAssistant: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('rex_ai_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch (e) {}
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 **ආයුබෝවන්! මම Rex AI Assistant.**\n\nඔබට Rex ERP එකේ **ඕනෑම අංශයක විස්තර** සජීවීව මගෙන් විමසන්න පුළුවන්:\n- 🛒 **Purchasing**: Purchase Prices (unitCost), Supplier rates & POs\n- 📦 **Inventory**: Stock balances, low stock alerts & locations\n- ⚙️ **Production**: Active Work Orders, machining jobs & operators\n- 💰 **Sales & CRM**: Customer dues, overdue invoices & quotations\n- 🏦 **Finance**: Bank balances, Cash in Hand & accounting summaries\n- 🔍 **Quality**: QC inspections, pass/fail status & defect logs\n\nපහත Quick Prompts වලින් එකක් click කර හෝ ඔබගේ ප්‍රශ්නය Type කර යවන්න!`,
        timestamp: new Date()
      }
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('rex_ai_chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Click outside drawer to close smoothly without darkening background
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeProvider = settings.ai_provider || 'gemini';
  const activeModel = activeProvider === 'gemini'
    ? (settings.gemini_model || 'gemini-1.5-flash')
    : (activeProvider === 'groq' 
        ? (settings.groq_model || 'llama-3.3-70b-versatile') 
        : (settings.openai_model || 'gpt-4o-mini'));
  const hasApiKey = Boolean(
    (settings.gemini_api_key && settings.gemini_api_key.trim().length > 0) ||
    (settings.groq_api_key && settings.groq_api_key.trim().length > 0) ||
    (settings.openai_api_key && settings.openai_api_key.trim().length > 0)
  );
  const isAiEnabled = settings.ai_enabled !== 'false';

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build conversation payload for backend (filtering out previous UI error banners)
      const convPayload = [...messages, userMsg]
        .filter(m => !m.content.startsWith('❌ **Error:**') && !m.content.startsWith('⚠️ **AI API Key'))
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: convPayload })
      });

      const data = await res.json().catch(() => ({ 
        success: false, 
        error: `Server responded with HTTP ${res.status}. කරුණාකර backend server එක ක්‍රියාත්මක දැයි පරීක්ෂා කරන්න.` 
      }));

      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            role: 'assistant',
            content: data.reply || 'No response generated.',
            timestamp: new Date(),
            model: data.model || activeModel
          }
        ]);
      } else if (data.missingKey) {
        setMessages(prev => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            role: 'assistant',
            content: `⚠️ **AI API Key එක තවමත් Configure කර නොමැත.**\n\nකරුණාකර **Admin > Variable Settings** වෙත ගොස් ඔබගේ නොමිලේ **Google Gemini API Key** එක (\`AIzaSy...\`) හෝ **Groq Key** එක ඇතුළත් කර **Test Connection** ඔබා Save කරන්න.\n\n*(Git Pull කළ විට local database එක වෙනස් නොවන බැවින්, මෙම PC එකෙහි API Key එක එක්වරක් Save කරගත යුතුය).*`,
            timestamp: new Date()
          }
        ]);
      } else {
        const errorText = data.error || 'Failed to process request.';
        const isKeyOrModelIssue = 
          errorText.toLowerCase().includes('model') || 
          errorText.toLowerCase().includes('does not exist') || 
          errorText.toLowerCase().includes('key') || 
          errorText.toLowerCase().includes('access') ||
          errorText.toLowerCase().includes('api request failed') ||
          errorText.toLowerCase().includes('unauthorized') ||
          errorText.toLowerCase().includes('unauthenticated') ||
          errorText.toLowerCase().includes('gemini');

        const solutionMsg = isKeyOrModelIssue 
          ? '\n\n💡 **විසඳුම (Solution):** කරුණාකර **Admin > Variable Settings** වෙත ගොස් ඔබගේ **Google Gemini API Key** එක (AIzaSy...) ඇතුළත් කර **Test Connection** ඔබා Save කරන්න.'
          : '';
        setMessages(prev => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            role: 'assistant',
            content: `❌ **Error:** ${errorText}${solutionMsg}`,
            timestamp: new Date()
          }
        ]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: `❌ **Network Connection Error:** Could not reach the backend AI service (${err?.message || 'Server offline'}).`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    const welcome: ChatMessage = {
      id: 'welcome_new',
      role: 'assistant',
      content: `👋 **Chat history cleared.** මගෙන් ඕනෑම Purchase Price එකක් හෝ Stock balance එකක් අහන්න!`,
      timestamp: new Date()
    };
    setMessages([welcome]);
    localStorage.removeItem('rex_ai_chat_history');
  };

  return (
    <>
      {/* Docked Half-Circle Trigger Button on Right Screen Edge */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="rex-ai-trigger-btn rounded-l-full fixed right-0 bottom-24 z-50 flex items-center h-[54px] cursor-pointer
            w-[52px] hover:w-[255px]
            bg-zinc-950/90 dark:bg-zinc-900/90 
            backdrop-blur-xl 
            border-y border-l border-rose-500/50 hover:border-rose-500 
            shadow-[-4px_0_22px_0_rgba(225,29,72,0.4)] hover:shadow-[-8px_0_35px_0_rgba(225,29,72,0.65)]
            transition-all duration-300 ease-out group overflow-hidden select-none"
          title="Rex AI Agent - Real-Time ERP Intelligence"
        >
          {/* Ambient Glowing Gradient Background */}
          <div 
            className="rex-ai-trigger-btn rounded-l-full absolute inset-0 bg-gradient-to-r from-rose-600/40 via-zinc-900/70 to-red-600/30 -z-10 group-hover:opacity-100 transition-opacity" 
          />

          {/* Top-half Glass Sheen / Reflection */}
          <div 
            style={{
              borderTopLeftRadius: '9999px',
              borderBottomLeftRadius: '0px',
              borderTopRightRadius: '0px',
              borderBottomRightRadius: '0px'
            }}
            className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" 
          />

          {/* Left Rex AI Logo Emblem (Always visible in half-circle) */}
          <div className="relative flex items-center justify-center w-[52px] h-[54px] shrink-0">
            <div 
              className="rounded-full w-9 h-9 relative flex items-center justify-center p-1 bg-black/60 backdrop-blur-md border border-white/20 shadow-inner group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
            >
              <RexAILogo variant="icon" size={26} />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span 
                  className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                ></span>
                <span 
                  className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-black"
                ></span>
              </span>
            </div>
          </div>

          {/* Expandable Content Container (Reveals smoothly on hover via pure CSS group-hover) */}
          <div 
            className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap 
              max-w-0 opacity-0 pr-0 
              group-hover:max-w-[195px] group-hover:opacity-100 group-hover:pr-3.5 
              transition-all duration-300 ease-out"
          >
            {/* Brand Text and Subtitle */}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="text-[13px] font-black tracking-wider text-white drop-shadow-xs">
                  REX <span className="text-rose-500">AI</span>
                </span>
                <span 
                  style={{ borderRadius: '9999px' }}
                  className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-rose-600 text-white tracking-wider shadow-2xs"
                >
                  AGENT
                </span>
              </div>
              <span className="text-[9px] text-zinc-300 font-medium leading-tight">
                Ask Anything &bull; Live ERP
              </span>
            </div>

            {/* Shimmering Sparkles */}
            <Sparkles size={14} className="text-amber-300 animate-pulse ml-auto shrink-0 group-hover:scale-125 transition-transform" />
          </div>
        </button>
      )}

      {/* Slide-Over Drawer / Panel: Solid, High-Contrast & Opaque (No Dark Background) */}
      {isOpen && (
        <div 
          ref={drawerRef}
          style={{ borderTopLeftRadius: '1.5rem', borderBottomLeftRadius: '1.5rem' }}
          className="fixed inset-y-0 right-0 z-[100] w-full sm:w-[520px] 
            bg-white dark:bg-zinc-900 
            border-l border-y border-zinc-200 dark:border-zinc-800 
            shadow-[-12px_0_40px_rgba(0,0,0,0.18)] dark:shadow-[-12px_0_40px_rgba(0,0,0,0.7)] 
            sm:rounded-l-3xl 
            flex flex-col animate-fade-in overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div 
                style={{ borderRadius: '1rem' }}
                className="relative p-1.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-sm flex items-center justify-center shrink-0"
              >
                <RexAILogo variant="icon" size={30} />
                <span 
                  style={{ borderRadius: '9999px' }}
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900"
                ></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tracking-wider text-zinc-900 dark:text-white">
                    REX <span className="text-rose-600">AI</span> AGENT
                  </span>
                  <span 
                    style={{ borderRadius: '9999px' }}
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      activeProvider === 'groq'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {activeProvider === 'groq' ? `⚡ ${activeModel} (Groq Free)` : `🧠 ${activeModel}`}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                  <span 
                    style={{ borderRadius: '9999px' }}
                    className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"
                  ></span>
                  Full ERP Intelligence & Function Calling Live
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/variables');
                }}
                style={{ borderRadius: '0.75rem' }}
                className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Variable Settings (Groq / OpenAI Key & Prompts)"
              >
                <SlidersHorizontal size={16} />
              </button>
              <button
                type="button"
                onClick={handleClear}
                style={{ borderRadius: '0.75rem' }}
                className="p-1.5 rounded-xl text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ borderRadius: '0.75rem' }}
                className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close Assistant"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Missing Key Alert Banner */}
          {!hasApiKey && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-amber-600" />
                <span>AI API Key not configured yet (Groq Llama 3.3 is 100% free).</span>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/variables');
                }}
                style={{ borderRadius: '0.5rem' }}
                className="text-[10px] font-bold text-amber-900 dark:text-amber-200 underline hover:opacity-80 shrink-0 cursor-pointer"
              >
                Add Free Key &rarr;
              </button>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-950">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  style={{
                    borderRadius: '1.25rem',
                    borderBottomRightRadius: m.role === 'user' ? '0.25rem' : '1.25rem',
                    borderBottomLeftRadius: m.role !== 'user' ? '0.25rem' : '1.25rem'
                  }}
                  className={`max-w-[88%] px-4 py-3 text-xs leading-relaxed shadow-sm relative group ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white font-medium'
                      : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {m.role === 'user' ? (
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  ) : (
                    renderFormattedMessage(m.content)
                  )}

                  {/* Message Action Strip */}
                  <div className={`mt-2 flex items-center justify-between text-[9px] border-t pt-1 ${
                    m.role === 'user' ? 'border-white/20 text-white/80' : 'border-zinc-100 dark:border-zinc-700 text-zinc-400'
                  }`}>
                    <span>{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(m.id, m.content)}
                      className="hover:opacity-100 flex items-center gap-1 transition-opacity ml-2 cursor-pointer"
                      title="Copy Message"
                    >
                      {copiedId === m.id ? <Check size={10} /> : <Copy size={10} />}
                      <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div 
                style={{ borderRadius: '1rem' }}
                className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm w-fit text-xs text-zinc-700 dark:text-zinc-300 animate-pulse"
              >
                <RefreshCw size={14} className="animate-spin text-rose-600" />
                <span>Querying Rex ERP Database...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestion Chips */}
          <div className="px-4 py-2.5 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Quick Inquiries Across All Modules
              </span>
              <span className="text-[9px] text-zinc-400">Scroll &rarr;</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSend(p.query)}
                  style={{ borderRadius: '9999px' }}
                  className="px-3 py-1.5 text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full whitespace-nowrap transition-all shrink-0 shadow-2xs hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input Bar */}
          <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask anything across Rex ERP (Prices, Stock, Work Orders, Invoices, Bank, QC)..."
                disabled={loading}
                style={{ borderRadius: '9999px' }}
                className="flex-1 px-4 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-inner transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
              <Button
                variant="primary"
                type="submit"
                disabled={loading || !input.trim()}
                style={{ borderRadius: '9999px' }}
                className="h-10 px-4 rounded-full font-bold text-xs shrink-0 shadow-md shadow-rose-500/25 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 cursor-pointer"
              >
                <Send size={14} />
              </Button>
            </form>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center mt-2 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Rex AI dynamically queries live Inventory, Production, Quotations, Invoices, Suppliers & Banking.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
