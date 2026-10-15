import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, Sparkles, X, Send, Trash2, SlidersHorizontal, AlertCircle, 
  ExternalLink, Copy, Check, ChevronDown, RefreshCw, Boxes, DollarSign, 
  Building2, FileText, ArrowRight
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/Button';

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

  useEffect(() => {
    localStorage.setItem('rex_ai_chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const hasApiKey = Boolean(settings.openai_api_key && settings.openai_api_key.trim().length > 0);
  const isAiEnabled = settings.ai_enabled !== 'false';
  const activeModel = settings.openai_model || 'gpt-4o-mini';

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
      // Build conversation payload for backend
      const convPayload = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: convPayload })
      });

      const data = await res.json();

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
            content: `⚠️ **OpenAI API Key එක තවමත් Configure කර නොමැත.**\n\nකරුණාකර **Admin > Variable Settings** වෙත ගොස් ඔබගේ OpenAI API Key එක ඇතුළත් කරන්න. ඉන්පසු සියලු මිල ගණන් සහ ERP දත්ත සජීවීව ලබාගත හැක.`,
            timestamp: new Date()
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            role: 'assistant',
            content: `❌ **Error:** ${data.error || 'Failed to process request.'}`,
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
      {/* Floating Trigger Button with Sleek Glassmorphism & Rounded Corners */}
      <button
        onClick={() => setIsOpen(p => !p)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-full 
          bg-white/20 dark:bg-slate-900/50 
          backdrop-blur-xl 
          border border-white/35 dark:border-white/15 
          shadow-[0_8px_32px_0_rgba(79,70,229,0.35)] 
          hover:shadow-[0_12px_45px_0_rgba(99,102,241,0.55)] 
          hover:scale-105 active:scale-95 
          transition-all duration-300 group overflow-hidden"
        title="Rex AI Assistant - Real-Time ERP Intelligence"
      >
        {/* Ambient Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-rex-600/85 via-indigo-600/75 to-purple-600/85 -z-10 group-hover:opacity-95 transition-opacity" />

        {/* Top-half Glass Sheen / Reflection */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-t-full" />

        {/* Bot Icon with Animated Live Status Indicator */}
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/35 shadow-inner">
          <Bot size={17} className="text-white group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-white"></span>
          </span>
        </div>

        {/* Brand Text and Subtitle */}
        <div className="flex flex-col text-left">
          <span className="text-xs font-black tracking-wide text-white drop-shadow-xs flex items-center gap-1.5 leading-tight">
            Rex AI
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-white/25 backdrop-blur-xs text-white border border-white/30 shadow-2xs">
              ERP
            </span>
          </span>
          <span className="text-[9px] text-white/85 font-medium hidden sm:inline leading-tight">
            Ask Anything
          </span>
        </div>

        {/* Shimmering Sparkles */}
        <Sparkles size={15} className="text-amber-300 animate-pulse ml-0.5 shrink-0 group-hover:scale-125 transition-transform" />
      </button>

      {/* Slide-Over Drawer / Panel with Glassmorphism */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-[100] w-full sm:w-[500px] 
          bg-surface/85 dark:bg-slate-950/85 
          backdrop-blur-2xl 
          border-l border-y border-white/20 dark:border-white/10 
          shadow-[0_16px_50px_0_rgba(0,0,0,0.35)] 
          sm:rounded-l-3xl 
          flex flex-col animate-fade-in overflow-hidden">
          
          {/* Header */}
          <div className="p-4 border-b border-theme-subtle/70 bg-surface2/50 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-rex-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-rex-500/25 border border-white/25">
                <Bot size={20} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-surface"></span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                  Rex AI Assistant
                  <span className="text-[9px] font-mono font-bold bg-rex-500/10 text-rex-600 px-2 py-0.5 rounded-full border border-rex-500/20">
                    {activeModel}
                  </span>
                </h3>
                <p className="text-[10px] text-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  All ERP Modules & Function Calling Connected
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
                className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface2/80 transition-colors"
                title="Variable Settings (OpenAI Key & Prompts)"
              >
                <SlidersHorizontal size={16} />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-xl text-muted hover:text-red-500 hover:bg-surface2/80 transition-colors"
                title="Clear Chat History"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface2/80 transition-colors"
                title="Close Assistant"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Missing Key Alert Banner */}
          {!hasApiKey && (
            <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>OpenAI API Key not configured yet.</span>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/variables');
                }}
                className="text-[10px] font-bold underline hover:text-amber-800 shrink-0"
              >
                Add Key &rarr;
              </button>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs relative group ${
                    m.role === 'user'
                      ? 'bg-rex-600 text-white rounded-br-xs'
                      : 'bg-surface2/70 text-primary border border-theme-subtle/80 rounded-bl-xs'
                  }`}
                >
                  {/* Content with basic line break rendering */}
                  <div className="whitespace-pre-wrap break-words">
                    {m.content}
                  </div>

                  {/* Message Action Strip */}
                  <div className={`mt-1.5 flex items-center justify-between text-[9px] opacity-70 border-t pt-1 ${
                    m.role === 'user' ? 'border-white/20 text-white/80' : 'border-theme-subtle text-muted'
                  }`}>
                    <span>{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(m.id, m.content)}
                      className="hover:opacity-100 flex items-center gap-1 transition-opacity ml-2"
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
              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-surface2/50 border border-theme-subtle w-fit text-xs text-secondary animate-pulse">
                <RefreshCw size={14} className="animate-spin text-rex-600" />
                <span>Querying Rex ERP Database...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestion Chips */}
          <div className="px-4 py-2.5 bg-surface2/40 backdrop-blur-md border-t border-theme-subtle/50 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                Quick Inquiries Across All Modules
              </span>
              <span className="text-[9px] text-muted">Scroll &rarr;</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSend(p.query)}
                  className="px-3 py-1.5 text-[11px] font-semibold bg-surface/80 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 dark:border-white/10 hover:border-rex-500/50 rounded-full whitespace-nowrap text-secondary hover:text-primary transition-all shrink-0 hover:bg-rex-500/10 shadow-xs hover:scale-[1.02] active:scale-95"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-theme-subtle bg-surface/90 backdrop-blur-md shrink-0">
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
                className="flex-1 px-4 py-2.5 rounded-full border border-theme-subtle/80 bg-surface2/50 backdrop-blur-sm text-primary text-xs focus:outline-none focus:border-rex-500 focus:ring-2 focus:ring-rex-500/20 shadow-inner transition-all placeholder:text-muted"
              />
              <Button
                variant="primary"
                type="submit"
                disabled={loading || !input.trim()}
                className="h-10 px-4 rounded-full font-bold text-xs shrink-0 shadow-lg shadow-rex-500/25 bg-gradient-to-r from-rex-600 to-indigo-600 hover:from-rex-500 hover:to-indigo-500"
              >
                <Send size={14} />
              </Button>
            </form>
            <p className="text-[10px] text-muted text-center mt-2 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Rex AI dynamically queries live Inventory, Production, Quotations, Invoices, Suppliers & Banking.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
