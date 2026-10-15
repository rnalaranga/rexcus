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
  { label: 'Check Item Purchase Price', query: 'What is the purchase price of EN8 round bar?' },
  { label: 'Low Stock Inventory', query: 'Which inventory items are currently running low on stock?' },
  { label: 'Customer Overdue Invoices', query: 'Which customers have unpaid or overdue invoices?' },
  { label: 'Recent Quotations Status', query: 'Show me an overview of recent quotations and their approval status' },
  { label: 'Supplier Purchasing Rates', query: 'Show our suppliers and recent purchase order rates' }
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
        content: `👋 **ආයුබෝවන්! මම Rex AI Assistant.**\n\nඔබට Rex ERP එකේ ඕනෑම භාණ්ඩයක **Purchase Price (මිලදී ගත් මිල)**, Supplier rates, Current Stock, හෝ Customer Invoices ගැන මගෙන් විමසන්න පුළුවන්. පහත Quick prompts වලින් එකක් click කර හෝ ඔබගේ ප්‍රශ්නය Type කර යවන්න!`,
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
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(p => !p)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-rex-600 via-rex-500 to-purple-600 text-white font-bold text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all group border border-white/20 backdrop-blur-md"
        title="Rex AI Assistant - Real-Time ERP Queries"
      >
        <div className="relative">
          <Bot size={18} className="animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-rex-600"></span>
        </div>
        <span className="hidden sm:inline font-bold tracking-wide">Rex AI Assistant</span>
        <Sparkles size={14} className="text-amber-300" />
      </button>

      {/* Slide-Over Drawer / Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-[100] w-full sm:w-[480px] bg-surface/95 backdrop-blur-xl border-l border-theme-subtle shadow-2xl flex flex-col animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-theme-subtle bg-surface2/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rex-600 to-purple-600 text-white flex items-center justify-center shadow-md">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                  Rex AI Assistant
                  <span className="text-[9px] font-mono font-bold bg-rex-500/10 text-rex-600 px-2 py-0.5 rounded-full border border-rex-500/20">
                    {activeModel}
                  </span>
                </h3>
                <p className="text-[10px] text-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  Live ERP Database & Function Calling Connected
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
                className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface2 transition-colors"
                title="Variable Settings (OpenAI Key & Prompts)"
              >
                <SlidersHorizontal size={16} />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-surface2 transition-colors"
                title="Clear Chat History"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface2 transition-colors"
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
          <div className="px-4 py-2 bg-surface2/30 border-t border-theme-subtle/50 shrink-0">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">
              Quick Inquiries
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSend(p.query)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-surface border border-theme-subtle hover:border-rex-500/40 rounded-full whitespace-nowrap text-secondary hover:text-primary transition-all shrink-0 hover:bg-rex-500/5 shadow-2xs"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-theme-subtle bg-surface shrink-0">
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
                placeholder="Ask about purchase prices, items, stock, dues..."
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-theme-subtle bg-surface2/40 text-primary text-xs focus:outline-none focus:border-rex-500 focus:ring-2 focus:ring-rex-500/20 shadow-xs transition-all placeholder:text-muted"
              />
              <Button
                variant="primary"
                type="submit"
                disabled={loading || !input.trim()}
                className="h-9 px-3.5 font-bold text-xs shrink-0 shadow-md shadow-rex-500/20"
              >
                <Send size={14} />
              </Button>
            </form>
            <p className="text-[10px] text-muted text-center mt-1.5">
              Rex AI dynamically queries live Inventory, Supplier POs, and Customer Ledger records.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
