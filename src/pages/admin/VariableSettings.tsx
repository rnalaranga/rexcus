import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/contexts/SettingsContext';
import { useDialog } from '@/components/ui/DialogProvider';
import { 
  SlidersHorizontal, Bot, KeyRound, Eye, EyeOff, CheckCircle2, 
  AlertCircle, Sparkles, Save, RefreshCw, Cpu, Database, 
  HelpCircle, ShieldCheck, Zap, Factory, Clock
} from 'lucide-react';
import { EmailSettingsManager } from '@/components/EmailSettingsManager';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const VariableSettings: React.FC = () => {
  const { toast } = useDialog();
  const { settings, updateSettings, loading } = useSettings();

  // AI Variables & Provider selection
  const [provider, setProvider] = useState<'gemini' | 'groq' | 'openai' | 'deepseek'>('gemini');

  // Google Gemini credentials & model
  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [availableGeminiModels, setAvailableGeminiModels] = useState<string[]>([]);

  // Groq credentials & model
  const [groqKey, setGroqKey] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [groqModel, setGroqModel] = useState('llama-3.1-8b-instant');
  const [availableGroqModels, setAvailableGroqModels] = useState<string[]>([]);

  // DeepSeek credentials & model
  const [deepseekKey, setDeepseekKey] = useState('');
  const [showDeepseekKey, setShowDeepseekKey] = useState(false);
  const [deepseekModel, setDeepseekModel] = useState('deepseek-chat');
  const [availableDeepSeekModels, setAvailableDeepSeekModels] = useState<string[]>([]);

  // OpenAI credentials & model
  const [openAiKey, setOpenAiKey] = useState('');
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [openAiModel, setOpenAiModel] = useState('gpt-4o-mini');
  const [availableOpenAiModels, setAvailableOpenAiModels] = useState<string[]>([]);

  const [aiEnabled, setAiEnabled] = useState(true);
  const [systemInstructions, setSystemInstructions] = useState('');

  // ERP Operational Variables
  const [quoteValidity, setQuoteValidity] = useState('30');
  const [leadTime, setLeadTime] = useState('14');
  const [lowStockWarning, setLowStockWarning] = useState('20');
  const [standardCreditDays, setStandardCreditDays] = useState('30');
  const [woPrefix, setWoPrefix] = useState('WO-');

  // Testing Key State
  const [testingKey, setTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Background fetch live models from configured backend keys
  useEffect(() => {
    const fetchLiveModels = async () => {
      try {
        const res = await fetch(`${API_BASE}/ai/models`);
        const data = await res.json();
        if (data.success && Array.isArray(data.models) && data.models.length > 0) {
          if (data.provider === 'gemini') {
            setAvailableGeminiModels(data.models);
          } else if (data.provider === 'groq') {
            setAvailableGroqModels(data.models);
          } else if (data.provider === 'deepseek') {
            setAvailableDeepSeekModels(data.models);
          } else {
            setAvailableOpenAiModels(data.models);
          }
        }
      } catch (err) {}
    };
    fetchLiveModels();
  }, []);

  // Sync settings when loaded
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      if (settings.ai_provider) setProvider(settings.ai_provider as 'gemini' | 'groq' | 'openai' | 'deepseek');
      if (settings.gemini_api_key) setGeminiKey(settings.gemini_api_key);
      if (settings.gemini_model) {
        setGeminiModel(settings.gemini_model);
      } else {
        setGeminiModel('gemini-1.5-flash');
      }
      if (settings.groq_api_key) setGroqKey(settings.groq_api_key);
      if (settings.groq_model) {
        if (settings.groq_model.includes('gpt-oss') || settings.groq_model.includes('llama-3.3-70b-versatile')) {
          setGroqModel('llama-3.1-8b-instant');
        } else {
          setGroqModel(settings.groq_model);
        }
      } else {
        setGroqModel('llama-3.1-8b-instant');
      }
      if (settings.deepseek_api_key) setDeepseekKey(settings.deepseek_api_key);
      if (settings.deepseek_model) {
        setDeepseekModel(settings.deepseek_model);
      } else {
        setDeepseekModel('deepseek-chat');
      }
      if (settings.openai_api_key) setOpenAiKey(settings.openai_api_key);
      if (settings.openai_model) {
        if (settings.openai_model.includes('luna')) {
          setOpenAiModel('gpt-4o-mini');
        } else {
          setOpenAiModel(settings.openai_model);
        }
      }
      if (settings.ai_enabled !== undefined) setAiEnabled(settings.ai_enabled !== 'false');
      if (settings.openai_system_instructions) {
        setSystemInstructions(settings.openai_system_instructions);
      } else {
        setSystemInstructions(
          `You are Rex AI, an intelligent, helpful ERP assistant for Rex Industries (Pvt) Ltd, Sri Lanka - an engineering, precision CNC machining, hydraulics, and metal fabrication company.
You answer questions in the language the user speaks (fluent Sinhala, Singlish, or English).
When asked about item prices, purchase rates, stock, customers, or suppliers, always call the appropriate tools to look up real-time records from the database.
All currency values are in Sri Lankan Rupees (LKR / Rs.).
Be concise, direct, polite, and format key data with clean markdown bullet points or tables.`
        );
      }

      if (settings.default_quote_validity_days) setQuoteValidity(settings.default_quote_validity_days);
      if (settings.default_lead_time_days) setLeadTime(settings.default_lead_time_days);
      if (settings.low_stock_warning_pct) setLowStockWarning(settings.low_stock_warning_pct);
      if (settings.standard_credit_days) setStandardCreditDays(settings.standard_credit_days);
      if (settings.work_order_prefix) setWoPrefix(settings.work_order_prefix);
    }
  }, [settings]);

  // Test Active Provider Key
  const handleTestKey = async () => {
    const keyToTest = provider === 'gemini' 
      ? geminiKey 
      : (provider === 'groq' ? groqKey : (provider === 'deepseek' ? deepseekKey : openAiKey));
    const providerName = provider === 'gemini' 
      ? 'Google Gemini' 
      : (provider === 'groq' ? 'Groq Cloud' : (provider === 'deepseek' ? 'DeepSeek' : 'OpenAI'));

    if (!keyToTest.trim()) {
      toast(`Please enter a ${providerName} API key first`, 'error');
      return;
    }
    setTestingKey(true);
    setKeyTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/ai/test-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToTest.trim(), provider })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setKeyTestResult({ success: true, msg: data.message || `${providerName} API key verified! Connection established.` });
        let newGeminiModel = geminiModel;
        let newGroqModel = groqModel;
        let newDeepSeekModel = deepseekModel;
        let newOpenAiModel = openAiModel;
        if (Array.isArray(data.models) && data.models.length > 0) {
          if (provider === 'gemini') {
            setAvailableGeminiModels(data.models);
            if (data.recommendedModel) {
              newGeminiModel = data.recommendedModel;
              setGeminiModel(data.recommendedModel);
            }
          } else if (provider === 'groq') {
            setAvailableGroqModels(data.models);
            if ((groqModel.includes('gpt-oss') || !data.models.includes(groqModel)) && data.recommendedModel) {
              newGroqModel = data.recommendedModel;
              setGroqModel(data.recommendedModel);
            }
          } else if (provider === 'deepseek') {
            setAvailableDeepSeekModels(data.models);
            if (data.recommendedModel) {
              newDeepSeekModel = data.recommendedModel;
              setDeepseekModel(data.recommendedModel);
            }
          } else {
            setAvailableOpenAiModels(data.models);
            if (!data.models.includes(openAiModel) && data.recommendedModel) {
              newOpenAiModel = data.recommendedModel;
              setOpenAiModel(data.recommendedModel);
            }
          }
        }
        // Auto-save verified key to backend immediately so the assistant works right away
        await updateSettings({
          ai_provider: provider,
          gemini_api_key: provider === 'gemini' ? keyToTest.trim() : geminiKey.trim(),
          gemini_model: newGeminiModel,
          groq_api_key: provider === 'groq' ? keyToTest.trim() : groqKey.trim(),
          groq_model: newGroqModel,
          deepseek_api_key: provider === 'deepseek' ? keyToTest.trim() : deepseekKey.trim(),
          deepseek_model: newDeepSeekModel,
          openai_api_key: provider === 'openai' ? keyToTest.trim() : openAiKey.trim(),
          openai_model: newOpenAiModel,
          ai_enabled: 'true'
        });
        toast(`${providerName} verified and saved successfully!`, 'success');
      } else {
        setKeyTestResult({ success: false, msg: data.error || `Failed to authenticate with ${providerName}.` });
        toast(data.error || 'Invalid API key or unauthorized', 'error');
      }
    } catch (err: any) {
      setKeyTestResult({ success: false, msg: err?.message || 'Network error while testing key' });
      toast('Failed to reach backend API', 'error');
    } finally {
      setTestingKey(false);
    }
  };

  // Save all settings
  const handleSave = async () => {
    setSaving(true);
    try {
      // Normalize model name (e.g. shorthand 8b -> llama-3.1-8b-instant, flash -> gemini-1.5-flash)
      let cleanGroq = groqModel.trim().toLowerCase();
      let normalizedGroqModel = groqModel.trim();
      if (cleanGroq === '8b' || cleanGroq === 'llama-8b' || cleanGroq === 'llama-3-8b' || cleanGroq === 'llama-3.1-8b' || cleanGroq === 'llama3.1-8b') {
        normalizedGroqModel = 'llama-3.1-8b-instant';
        setGroqModel('llama-3.1-8b-instant');
      } else if (cleanGroq === '70b' || cleanGroq === 'llama-70b' || cleanGroq === 'llama-3-70b' || cleanGroq === 'llama-3.3-70b') {
        normalizedGroqModel = 'llama-3.3-70b-versatile';
        setGroqModel('llama-3.3-70b-versatile');
      }

      let cleanGemini = geminiModel.trim().toLowerCase();
      let normalizedGeminiModel = geminiModel.trim();
      if (cleanGemini === 'flash' || cleanGemini === '1.5-flash' || cleanGemini === 'gemini-flash') {
        normalizedGeminiModel = 'gemini-1.5-flash';
        setGeminiModel('gemini-1.5-flash');
      } else if (cleanGemini === '2.0-flash' || cleanGemini === '2-flash') {
        normalizedGeminiModel = 'gemini-2.0-flash';
        setGeminiModel('gemini-2.0-flash');
      } else if (cleanGemini === 'pro' || cleanGemini === '1.5-pro') {
        normalizedGeminiModel = 'gemini-1.5-pro';
        setGeminiModel('gemini-1.5-pro');
      }

      await updateSettings({
        ai_provider: provider,
        gemini_api_key: geminiKey.trim(),
        gemini_model: normalizedGeminiModel || 'gemini-1.5-flash',
        groq_api_key: groqKey.trim(),
        groq_model: normalizedGroqModel,
        deepseek_api_key: deepseekKey.trim(),
        deepseek_model: deepseekModel || 'deepseek-chat',
        openai_api_key: openAiKey.trim(),
        openai_model: openAiModel,
        openai_system_instructions: systemInstructions,
        ai_enabled: aiEnabled ? 'true' : 'false',
        default_quote_validity_days: quoteValidity,
        default_lead_time_days: leadTime,
        low_stock_warning_pct: lowStockWarning,
        standard_credit_days: standardCreditDays,
        work_order_prefix: woPrefix
      });
      toast('Variable settings updated successfully!', 'success');
    } catch (err: any) {
      toast(err?.message || 'Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rex-500/10 text-rex-600 flex items-center justify-center font-bold">
              <SlidersHorizontal size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary flex items-center gap-2">
                Variable Settings
                <span className="text-[10px] font-mono uppercase bg-rex-500/10 text-rex-600 px-2.5 py-0.5 rounded-full border border-rex-500/20 font-bold">
                  System & AI Config
                </span>
              </h1>
              <p className="text-xs text-muted mt-0.5">
                Manage AI credentials (Groq Cloud / OpenAI), custom prompt instructions, and operational ERP variables.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSave}
            disabled={saving || loading}
            className="font-bold text-xs shadow-md shadow-rex-500/20"
          >
            {saving ? 'Saving...' : 'Save Variable Settings'}
          </Button>
        </div>
      </div>

      {/* --- SECTION 1: AI ASSISTANT & PROVIDER CONFIGURATION --- */}
      <GlassCard className="p-6 border border-theme-subtle rounded-2xl shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-theme-subtle pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                Rex AI Engine & Model Configuration
              </h2>
              <p className="text-xs text-muted">
                Powers real-time natural language ERP queries for purchase prices, stock balances, machine operations, and customer dues.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={e => setAiEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              <span className="ml-2.5 text-xs font-bold text-primary">
                {aiEnabled ? 'AI Active' : 'AI Disabled'}
              </span>
            </label>
          </div>
        </div>

        {/* AI Provider Switch */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-secondary flex items-center justify-between">
            <span>Select Active AI Provider Engine</span>
            <span className="text-[10px] text-muted">Choose between Free Google Gemini, Groq Llama, DeepSeek, or OpenAI</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Google Gemini Option (Recommended #1) */}
            <button
              type="button"
              onClick={() => { setProvider('gemini'); setKeyTestResult(null); }}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                provider === 'gemini'
                  ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-surface border-theme-subtle hover:border-theme-strong'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${provider === 'gemini' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-surface2 text-muted'}`}>
                <Sparkles size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs text-primary flex items-center gap-1.5">
                    Google Gemini
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 shrink-0">
                    Free · Top Choice
                  </span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Super fast, 1M context, generous free quota with zero model limits. Fluent in Sinhala and English.
                </p>
              </div>
            </button>

            {/* Groq Cloud Option */}
            <button
              type="button"
              onClick={() => { setProvider('groq'); setKeyTestResult(null); }}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                provider === 'groq'
                  ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                  : 'bg-surface border-theme-subtle hover:border-theme-strong'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${provider === 'groq' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-surface2 text-muted'}`}>
                <Zap size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs text-primary flex items-center gap-1.5">
                    Groq Cloud (Meta Llama)
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 shrink-0">
                    100% Free
                  </span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Ultra-fast ~560 tps, native function calling for live ERP queries.
                </p>
              </div>
            </button>

            {/* DeepSeek Option */}
            <button
              type="button"
              onClick={() => { setProvider('deepseek'); setKeyTestResult(null); }}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                provider === 'deepseek'
                  ? 'bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/20 shadow-sm'
                  : 'bg-surface border-theme-subtle hover:border-theme-strong'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${provider === 'deepseek' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/30' : 'bg-surface2 text-muted'}`}>
                <Cpu size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs text-primary flex items-center gap-1.5">
                    DeepSeek (V3 / R1)
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shrink-0">
                    Ultra-Low Cost
                  </span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  DeepSeek-V3 & R1. 20x cheaper than OpenAI, native tool calling, deep reasoning & fluent Singlish.
                </p>
              </div>
            </button>

            {/* OpenAI Option */}
            <button
              type="button"
              onClick={() => { setProvider('openai'); setKeyTestResult(null); }}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                provider === 'openai'
                  ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20 shadow-sm'
                  : 'bg-surface border-theme-subtle hover:border-theme-strong'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${provider === 'openai' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30' : 'bg-surface2 text-muted'}`}>
                <Bot size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs text-primary">OpenAI (GPT-4o)</span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-surface2 text-secondary border border-theme-subtle shrink-0">
                    Paid Key
                  </span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  OpenAI models (GPT-4o-mini, GPT-4o). Requires paid OpenAI billing credits.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* --- PROVIDER SPECIFIC SETTINGS --- */}
        {provider === 'gemini' ? (
          /* GOOGLE GEMINI SETTINGS */
          <div className="space-y-5 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
            {/* Gemini Key Input & Verification */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-secondary flex items-center gap-1.5">
                  <KeyRound size={14} className="text-blue-500" />
                  Google Gemini API Key <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {geminiKey ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Configured
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1">
                      <AlertCircle size={11} /> Key Missing
                    </span>
                  )}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
                  >
                    Get Free Gemini Key &rarr;
                  </a>
                </div>
              </div>

              {/* Key format warning if user pasted a Groq or OpenAI key */}
              {(geminiKey.trim().startsWith('gsk_') || geminiKey.trim().startsWith('sk-')) && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-amber-500" />
                  <span>
                    Notice: Google Gemini API keys begin with <code className="font-bold bg-amber-500/20 px-1 py-0.5 rounded">AIzaSy...</code>. You appear to have entered a Groq or OpenAI key.
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={e => {
                      const val = e.target.value;
                      setGeminiKey(val);
                      setKeyTestResult(null);
                      if (val.trim().startsWith('gsk_')) setProvider('groq');
                      else if (val.trim().startsWith('sk-')) setProvider('openai');
                    }}
                    placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-theme-subtle bg-surface text-primary font-mono text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(p => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-primary transition-colors"
                    title={showGeminiKey ? 'Hide Secret Key' : 'Reveal Secret Key'}
                  >
                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleTestKey}
                  disabled={testingKey || !geminiKey.trim()}
                  className="text-xs font-bold border border-theme-subtle bg-surface hover:bg-surface2 shrink-0 px-4"
                >
                  {testingKey ? (
                    <>
                      <RefreshCw size={14} className="animate-spin mr-1.5" /> Testing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} className="text-blue-500 mr-1.5" /> Test Connection
                    </>
                  )}
                </Button>
              </div>

              {keyTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    keyTestResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-600'
                  }`}
                >
                  {keyTestResult.success ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                  <span>{keyTestResult.msg}</span>
                </div>
              )}
            </div>

            {/* Gemini Model Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-secondary flex items-center gap-1.5">
                  <Cpu size={14} className="text-blue-500" />
                  Google Gemini Model Engine
                </label>
                <span className="text-[10px] font-mono text-muted">Active: <span className="font-bold text-blue-600 dark:text-blue-400">{geminiModel}</span></span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Option 1: Gemini 1.5 Flash */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    geminiModel === 'gemini-1.5-flash'
                      ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-surface border-theme-subtle hover:border-theme-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1">
                        <Zap size={13} className="text-blue-500" />
                        gemini-1.5-flash
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                        100% Free · Recommended
                      </span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-3">
                      Super fast, 1M context window, high TPM quota. Native ERP tool calling with zero rate limit issues.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="gemini_model"
                    value="gemini-1.5-flash"
                    checked={geminiModel === 'gemini-1.5-flash'}
                    onChange={e => {
                      setGeminiModel(e.target.value);
                      updateSettings({ gemini_model: e.target.value });
                    }}
                    className="sr-only"
                  />
                </label>

                {/* Option 2: Gemini 2.0 Flash */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    geminiModel === 'gemini-2.0-flash'
                      ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-surface border-theme-subtle hover:border-theme-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1">
                        <Cpu size={13} className="text-indigo-500" />
                        gemini-2.0-flash
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                        Next-Gen Flash
                      </span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-3">
                      Next-generation multimodal model with enhanced reasoning and tool execution speed.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="gemini_model"
                    value="gemini-2.0-flash"
                    checked={geminiModel === 'gemini-2.0-flash'}
                    onChange={e => {
                      setGeminiModel(e.target.value);
                      updateSettings({ gemini_model: e.target.value });
                    }}
                    className="sr-only"
                  />
                </label>

                {/* Option 3: Gemini 1.5 Pro */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    geminiModel === 'gemini-1.5-pro'
                      ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-surface border-theme-subtle hover:border-theme-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1">
                        <Sparkles size={13} className="text-purple-500" />
                        gemini-1.5-pro
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                        Flagship Reasoning
                      </span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-3">
                      Deep technical reasoning with up to 2M context window. Excellent for complex multi-step analysis.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="gemini_model"
                    value="gemini-1.5-pro"
                    checked={geminiModel === 'gemini-1.5-pro'}
                    onChange={e => {
                      setGeminiModel(e.target.value);
                      updateSettings({ gemini_model: e.target.value });
                    }}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Live Discovered Models from User's Google AI Studio Account */}
              {availableGeminiModels.length > 0 && (
                <div className="p-3.5 rounded-xl bg-surface border-2 border-blue-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-blue-500" />
                      Live Models Detected on Your Google AI Studio Account ({availableGeminiModels.length}):
                    </span>
                    <span className="text-[11px] text-muted">Click any model pill to activate & save immediately</span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pt-1">
                    {availableGeminiModels.map((m) => {
                      const isSelected = geminiModel === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setGeminiModel(m);
                            updateSettings({ gemini_model: m });
                            toast(`Activated & saved model: ${m}`, 'success');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500'
                              : 'bg-surface2 hover:bg-surface2/80 text-primary border border-theme-subtle hover:border-blue-500'
                          }`}
                        >
                          {isSelected ? <CheckCircle2 size={13} className="text-white" /> : <div className="w-2 h-2 rounded-full bg-blue-500" />}
                          {m}
                          <span className={`text-[8px] uppercase tracking-wider px-1 py-0.2 rounded font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                            Tools Ready
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Gemini Model Input */}
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[11px] text-muted shrink-0 font-medium">Or custom Gemini model:</span>
                <input
                  type="text"
                  value={geminiModel}
                  onChange={e => setGeminiModel(e.target.value)}
                  onBlur={() => {
                    const m = geminiModel.trim().toLowerCase();
                    if (m === 'flash' || m === '1.5-flash' || m === 'gemini-flash') {
                      setGeminiModel('gemini-1.5-flash');
                    } else if (m === '2.0-flash' || m === '2-flash') {
                      setGeminiModel('gemini-2.0-flash');
                    } else if (m === 'pro' || m === '1.5-pro') {
                      setGeminiModel('gemini-1.5-pro');
                    }
                  }}
                  placeholder="e.g. gemini-1.5-flash, gemini-2.0-flash"
                  className="px-3 py-1.5 rounded-lg border border-theme-subtle bg-surface text-primary font-mono text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 w-80"
                />
              </div>
            </div>
          </div>
        ) : provider === 'groq' ? (
          /* GROQ CLOUD SETTINGS */
          <div className="space-y-5 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            {/* Groq Key Input & Verification */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-secondary flex items-center gap-1.5">
                  <KeyRound size={14} className="text-amber-500" />
                  Groq Cloud API Secret Key <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {groqKey ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Configured
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                      <AlertCircle size={11} /> Key Missing
                    </span>
                  )}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1"
                  >
                    Get Free Groq Key &rarr;
                  </a>
                </div>
              </div>

              {/* Key format warning if user pasted an OpenAI key */}
              {groqKey.trim().startsWith('sk-') && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-amber-500" />
                  <span>
                    Notice: This key starts with <code className="font-bold bg-amber-500/20 px-1 py-0.5 rounded">sk-</code>, which looks like an OpenAI key. Groq Cloud API keys begin with <code className="font-bold bg-amber-500/20 px-1 py-0.5 rounded">gsk_</code>.
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showGroqKey ? 'text' : 'password'}
                    value={groqKey}
                    onChange={e => {
                      setGroqKey(e.target.value);
                      setKeyTestResult(null);
                    }}
                    placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-theme-subtle bg-surface text-primary font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey(p => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-primary transition-colors"
                    title={showGroqKey ? 'Hide Secret Key' : 'Reveal Secret Key'}
                  >
                    {showGroqKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleTestKey}
                  disabled={testingKey || !groqKey.trim()}
                  className="text-xs font-bold border border-theme-subtle bg-surface hover:bg-surface2 shrink-0 px-4"
                >
                  {testingKey ? (
                    <>
                      <RefreshCw size={14} className="animate-spin mr-1.5" /> Testing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} className="text-amber-500 mr-1.5" /> Test Connection
                    </>
                  )}
                </Button>
              </div>

              {keyTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    keyTestResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-600'
                  }`}
                >
                  {keyTestResult.success ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                  <span>{keyTestResult.msg}</span>
                </div>
              )}
            </div>

            {/* Groq Model Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-secondary flex items-center gap-1.5">
                  <Cpu size={14} className="text-amber-500" />
                  Groq Model Engine
                </label>
                <span className="text-[10px] font-mono text-muted">Active: <span className="font-bold text-amber-600 dark:text-amber-400">{groqModel}</span></span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Option 1: Meta Llama 3.3 70B (Primary Recommended / Flagship) */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    groqModel === 'llama-3.3-70b-versatile'
                      ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                      : 'bg-surface border-theme-subtle hover:border-theme-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1">
                        <Cpu size={13} className="text-amber-500" />
                        llama-3.3-70b
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                        100% Free · Recommended
                      </span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-3">
                      Flagship Meta 70B model with deep reasoning, native ERP tool calling, and zero repetition issues.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="groq_model"
                    value="llama-3.3-70b-versatile"
                    checked={groqModel === 'llama-3.3-70b-versatile'}
                    onChange={e => {
                      setGroqModel(e.target.value);
                      updateSettings({ groq_model: e.target.value });
                    }}
                    className="sr-only"
                  />
                </label>

                {/* Option 2: Meta Llama 3.1 8B Instant (Ultra-Fast) */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    groqModel === 'llama-3.1-8b-instant'
                      ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                      : 'bg-surface border-theme-subtle hover:border-theme-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1">
                        <Zap size={13} className="text-amber-500" />
                        llama-3.1-8b
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/30">
                        Ultra-Fast · 8B
                      </span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-3">
                      Blazing fast ~560 tps with generous 30k TPM limit. Lightweight tool calling for quick lookups.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="groq_model"
                    value="llama-3.1-8b-instant"
                    checked={groqModel === 'llama-3.1-8b-instant'}
                    onChange={e => {
                      setGroqModel(e.target.value);
                      updateSettings({ groq_model: e.target.value });
                    }}
                    className="sr-only"
                  />
                </label>

                {/* Option 3: Meta Llama 3.1 70B (High Precision & 128k Context) */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    groqModel === 'llama-3.1-70b-versatile'
                      ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                      : 'bg-surface border-theme-subtle hover:border-theme-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1">
                        <Cpu size={13} className="text-amber-500" />
                        llama-3.1-70b
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                        128k Context
                      </span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-3">
                      Proven Meta 70B model with native ERP database tools and comprehensive reasoning.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="groq_model"
                    value="llama-3.1-70b-versatile"
                    checked={groqModel === 'llama-3.1-70b-versatile'}
                    onChange={e => {
                      setGroqModel(e.target.value);
                      updateSettings({ groq_model: e.target.value });
                    }}
                    className="sr-only"
                  />
                </label>

                {/* Option 4: Meta Llama 3 70B (High Reliability) */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    groqModel === 'llama3-70b-8192'
                      ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                      : 'bg-surface border-theme-subtle hover:border-theme-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1">
                        <Cpu size={13} className="text-amber-500" />
                        llama3-70b
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                        100% Free · Tools
                      </span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-3">
                      High reliability 70B model with full ERP function calling support for stock & contact lookups.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="groq_model"
                    value="llama3-70b-8192"
                    checked={groqModel === 'llama3-70b-8192'}
                    onChange={e => {
                      setGroqModel(e.target.value);
                      updateSettings({ groq_model: e.target.value });
                    }}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Live Discovered Models from User's Account */}
              {availableGroqModels.length > 0 && (
                <div className="p-3.5 rounded-xl bg-surface border-2 border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-500" />
                      Live Models Detected on Your Groq Account ({availableGroqModels.length}):
                    </span>
                    <span className="text-[11px] text-muted">Click any model pill to activate & save immediately</span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pt-1">
                    {availableGroqModels.map((m) => {
                      const isSelected = groqModel === m;
                      const isToolReady = m.includes('llama-3') || m.includes('llama3') || m.includes('tool-use');
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setGroqModel(m);
                            updateSettings({ groq_model: m });
                            toast(`Activated & saved model: ${m}`, 'success');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500'
                              : 'bg-surface2 hover:bg-surface2/80 text-primary border border-theme-subtle hover:border-emerald-500'
                          }`}
                        >
                          {isSelected ? <CheckCircle2 size={13} className="text-white" /> : <div className={`w-2 h-2 rounded-full ${isToolReady ? 'bg-emerald-500' : 'bg-amber-400'}`} />}
                          {m}
                          {isToolReady && (
                            <span className={`text-[8px] uppercase tracking-wider px-1 py-0.2 rounded font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                              Tools Ready
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Groq Model Input */}
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[11px] text-muted shrink-0 font-medium">Or custom Groq model:</span>
                <input
                  type="text"
                  value={groqModel}
                  onChange={e => setGroqModel(e.target.value)}
                  onBlur={() => {
                    const m = groqModel.trim().toLowerCase();
                    if (m === '8b' || m === 'llama-8b' || m === 'llama-3-8b' || m === 'llama-3.1-8b' || m === 'llama3.1-8b') {
                      setGroqModel('llama-3.1-8b-instant');
                    } else if (m === '70b' || m === 'llama-70b' || m === 'llama-3-70b' || m === 'llama-3.3-70b') {
                      setGroqModel('llama-3.3-70b-versatile');
                    }
                  }}
                  placeholder="e.g. llama-3.1-8b-instant, llama-3.3-70b-versatile"
                  className="px-3 py-1.5 rounded-lg border border-theme-subtle bg-surface text-primary font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 w-80"
                />
              </div>
            </div>
          </div>
        ) : provider === 'deepseek' ? (
          /* DEEPSEEK SETTINGS */
          <div className="space-y-5 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
            {/* DeepSeek API Key Input & Verification */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-secondary flex items-center gap-1.5">
                  <KeyRound size={14} className="text-cyan-600 dark:text-cyan-400" />
                  DeepSeek API Key <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {deepseekKey ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Configured
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-cyan-600 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 flex items-center gap-1">
                      <AlertCircle size={11} /> Key Missing
                    </span>
                  )}
                  <a
                    href="https://platform.deepseek.com/api_keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline font-bold flex items-center gap-1"
                  >
                    Get DeepSeek Key &rarr;
                  </a>
                </div>
              </div>

              {/* Key format warning if user pasted a Groq key */}
              {deepseekKey.trim().startsWith('gsk_') && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-amber-500" />
                  <span>
                    Notice: This key starts with <code className="font-bold bg-amber-500/20 px-1 py-0.5 rounded">gsk_</code>, which is a Groq key. DeepSeek API keys begin with <code className="font-bold bg-amber-500/20 px-1 py-0.5 rounded">sk-</code>.
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showDeepseekKey ? 'text' : 'password'}
                    value={deepseekKey}
                    onChange={e => {
                      setDeepseekKey(e.target.value);
                      setKeyTestResult(null);
                    }}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-theme-subtle bg-surface text-primary font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-xs transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeepseekKey(p => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-primary transition-colors"
                    title={showDeepseekKey ? 'Hide Secret Key' : 'Reveal Secret Key'}
                  >
                    {showDeepseekKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleTestKey}
                  disabled={testingKey || !deepseekKey.trim()}
                  className="text-xs font-bold border border-theme-subtle bg-surface hover:bg-surface2 shrink-0 px-4"
                >
                  {testingKey ? (
                    <>
                      <RefreshCw size={14} className="animate-spin mr-1.5" /> Testing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} className="text-cyan-600 dark:text-cyan-400 mr-1.5" /> Test Connection
                    </>
                  )}
                </Button>
              </div>

              {keyTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    keyTestResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-600'
                  }`}
                >
                  {keyTestResult.success ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                  <span>{keyTestResult.msg}</span>
                </div>
              )}
            </div>

            {/* DeepSeek Model Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-secondary flex items-center gap-1.5">
                  <Cpu size={14} className="text-cyan-600 dark:text-cyan-400" />
                  DeepSeek Model Engine
                </label>
                <span className="text-[10px] font-mono text-muted">Active: <span className="font-bold text-cyan-600 dark:text-cyan-400">{deepseekModel}</span></span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: DeepSeek Chat (V3) */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    deepseekModel === 'deepseek-chat'
                      ? 'bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/20 shadow-sm'
                      : 'bg-surface border-theme-subtle hover:border-theme-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1">
                        <Sparkles size={13} className="text-cyan-600 dark:text-cyan-400" />
                        deepseek-chat
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                        DeepSeek-V3 · Recommended
                      </span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-3">
                      DeepSeek-V3 flagship. Full tool calling & function calling support for ERP database queries, quotes, and leads.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="deepseek_model"
                    value="deepseek-chat"
                    checked={deepseekModel === 'deepseek-chat'}
                    onChange={e => {
                      setDeepseekModel(e.target.value);
                      updateSettings({ deepseek_model: e.target.value });
                    }}
                    className="sr-only"
                  />
                </label>

                {/* Option 2: DeepSeek Reasoner (R1) */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    deepseekModel === 'deepseek-reasoner'
                      ? 'bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/20 shadow-sm'
                      : 'bg-surface border-theme-subtle hover:border-theme-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1">
                        <Cpu size={13} className="text-cyan-600 dark:text-cyan-400" />
                        deepseek-reasoner
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                        DeepSeek-R1 · Reasoning
                      </span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-3">
                      DeepSeek-R1 reasoning model with chain-of-thought analysis. Superb for complex math, business strategy, and in-depth analytics.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="deepseek_model"
                    value="deepseek-reasoner"
                    checked={deepseekModel === 'deepseek-reasoner'}
                    onChange={e => {
                      setDeepseekModel(e.target.value);
                      updateSettings({ deepseek_model: e.target.value });
                    }}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Live Discovered Models from DeepSeek Account */}
              {availableDeepSeekModels.length > 0 && (
                <div className="p-3.5 rounded-xl bg-surface border-2 border-cyan-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-cyan-500" />
                      Live Models Detected on Your DeepSeek Account ({availableDeepSeekModels.length}):
                    </span>
                    <span className="text-[11px] text-muted">Click any model pill to activate & save immediately</span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pt-1">
                    {availableDeepSeekModels.map((m) => {
                      const isSelected = deepseekModel === m;
                      const isToolReady = m.includes('chat') || m.includes('v3');
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setDeepseekModel(m);
                            updateSettings({ deepseek_model: m });
                            toast(`Activated & saved model: ${m}`, 'success');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-500'
                              : 'bg-surface2 hover:bg-surface2/80 text-primary border border-theme-subtle hover:border-cyan-500'
                          }`}
                        >
                          {isSelected ? <CheckCircle2 size={13} className="text-white" /> : <div className={`w-2 h-2 rounded-full ${isToolReady ? 'bg-cyan-500' : 'bg-purple-400'}`} />}
                          {m}
                          {isToolReady && (
                            <span className={`text-[8px] uppercase tracking-wider px-1 py-0.2 rounded font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'}`}>
                              Tools Ready
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom DeepSeek Model Input */}
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[11px] text-muted shrink-0 font-medium">Or custom DeepSeek model:</span>
                <input
                  type="text"
                  value={deepseekModel}
                  onChange={e => setDeepseekModel(e.target.value)}
                  placeholder="e.g. deepseek-chat, deepseek-reasoner"
                  className="px-3 py-1.5 rounded-lg border border-theme-subtle bg-surface text-primary font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 w-80"
                />
              </div>
            </div>
          </div>
        ) : (
          /* OPENAI SETTINGS */
          <div className="space-y-5 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
            {/* OpenAI API Key Input & Verification */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-secondary flex items-center gap-1.5">
                  <KeyRound size={14} className="text-rose-500" />
                  OpenAI API Secret Key <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {openAiKey ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Configured
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                      <AlertCircle size={11} /> Key Missing
                    </span>
                  )}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-rose-600 hover:underline font-bold"
                  >
                    Get OpenAI Key &rarr;
                  </a>
                </div>
              </div>

              {/* Key format warning if user pasted a Groq key */}
              {openAiKey.trim().startsWith('gsk_') && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-500" />
                  <span>
                    Notice: This key starts with <code className="font-bold bg-rose-500/20 px-1 py-0.5 rounded">gsk_</code>, which is a Groq key. OpenAI API keys begin with <code className="font-bold bg-rose-500/20 px-1 py-0.5 rounded">sk-</code>.
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showOpenAiKey ? 'text' : 'password'}
                    value={openAiKey}
                    onChange={e => {
                      setOpenAiKey(e.target.value);
                      setKeyTestResult(null);
                    }}
                    placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-theme-subtle bg-surface text-primary font-mono text-xs focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-xs transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenAiKey(p => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-primary transition-colors"
                    title={showOpenAiKey ? 'Hide Secret Key' : 'Reveal Secret Key'}
                  >
                    {showOpenAiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleTestKey}
                  disabled={testingKey || !openAiKey.trim()}
                  className="text-xs font-bold border border-theme-subtle bg-surface hover:bg-surface2 shrink-0 px-4"
                >
                  {testingKey ? (
                    <>
                      <RefreshCw size={14} className="animate-spin mr-1.5" /> Testing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} className="text-rose-500 mr-1.5" /> Test Connection
                    </>
                  )}
                </Button>
              </div>

              {keyTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    keyTestResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-600'
                  }`}
                >
                  {keyTestResult.success ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                  <span>{keyTestResult.msg}</span>
                </div>
              )}
            </div>

            {/* OpenAI Model Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-secondary flex items-center gap-1.5">
                  <Cpu size={14} className="text-rose-600" />
                  OpenAI Model Engine
                </label>
                <span className="text-[10px] font-mono text-muted">Active: <span className="font-bold text-rose-600 dark:text-rose-400">{openAiModel}</span></span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Option 1: GPT-4o Mini */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    openAiModel === 'gpt-4o-mini'
                      ? 'bg-rose-500/10 border-rose-500 shadow-sm shadow-rose-500/20'
                      : 'bg-surface border-theme-subtle hover:border-theme-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1">
                        <Zap size={13} className="text-emerald-500" />
                        gpt-4o-mini
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-3">
                      Fastest response time, highly accurate tool calling for ERP database queries, lowest latency.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="openai_model"
                    value="gpt-4o-mini"
                    checked={openAiModel === 'gpt-4o-mini'}
                    onChange={e => setOpenAiModel(e.target.value)}
                    className="sr-only"
                  />
                </label>

                {/* Option 2: GPT-4o */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    openAiModel === 'gpt-4o'
                      ? 'bg-rose-500/10 border-rose-500 shadow-sm shadow-rose-500/20'
                      : 'bg-surface border-theme-subtle hover:border-theme-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1">
                        <Cpu size={13} className="text-purple-500" />
                        gpt-4o
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        Deep Reasoning
                      </span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-3">
                      Complex analytical reasoning for deep financial audits, comprehensive forecasting, and large reports.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="openai_model"
                    value="gpt-4o"
                    checked={openAiModel === 'gpt-4o'}
                    onChange={e => setOpenAiModel(e.target.value)}
                    className="sr-only"
                  />
                </label>

                {/* Option 3: GPT-4 Turbo */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    openAiModel === 'gpt-4-turbo'
                      ? 'bg-rose-500/10 border-rose-500 shadow-sm shadow-rose-500/20'
                      : 'bg-surface border-theme-subtle hover:border-theme-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-primary font-mono">gpt-4-turbo</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-surface2 text-secondary border border-theme-subtle">
                        High Capacity
                      </span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-3">
                      High context capacity and multi-step tool execution.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="openai_model"
                    value="gpt-4-turbo"
                    checked={openAiModel === 'gpt-4-turbo'}
                    onChange={e => setOpenAiModel(e.target.value)}
                    className="sr-only"
                  />
                </label>

                {/* Option 4: GPT-6 Luna */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    openAiModel === 'gpt-6-luna'
                      ? 'bg-rose-500/10 border-rose-500 shadow-sm shadow-rose-500/20'
                      : 'bg-surface border-theme-subtle hover:border-theme-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1">
                        <Sparkles size={13} className="text-rose-500" />
                        gpt-6-luna
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30">
                        Next-Gen
                      </span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-3">
                      Future reasoning preview engine with auto-fallback to gpt-4o-mini if unavailable.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="openai_model"
                    value="gpt-6-luna"
                    checked={openAiModel === 'gpt-6-luna'}
                    onChange={e => setOpenAiModel(e.target.value)}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Live Discovered Models from OpenAI Account */}
              {availableOpenAiModels.length > 0 && (
                <div className="p-3 rounded-xl bg-surface border border-theme-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-secondary flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      Live Models Detected on Your OpenAI Account ({availableOpenAiModels.length}):
                    </span>
                    <span className="text-[10px] text-muted">Click any model to select</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {availableOpenAiModels.map((m) => {
                      const isSelected = openAiModel === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setOpenAiModel(m)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-rose-500 text-white font-bold shadow-xs'
                              : 'bg-surface2 hover:bg-surface2/80 text-primary border border-theme-subtle'
                          }`}
                        >
                          {isSelected && <CheckCircle2 size={11} />}
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Model Input */}
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[11px] text-muted shrink-0 font-medium">Or custom model identifier:</span>
                <input
                  type="text"
                  value={openAiModel}
                  onChange={e => setOpenAiModel(e.target.value)}
                  placeholder="e.g. gpt-4o-mini, gpt-4o, o3-mini"
                  className="px-3 py-1.5 rounded-lg border border-theme-subtle bg-surface text-primary font-mono text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 w-80"
                />
              </div>
            </div>
          </div>
        )}

        {/* Custom Business Context / System Prompt */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-secondary flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Bot size={14} className="text-rex-600" />
              Company Context & System Prompt Instructions
            </span>
            <span className="text-[10px] text-muted font-normal">
              Instructs how the AI formats currency, answers in Sinhala/Singlish, and behaves
            </span>
          </label>
          <textarea
            rows={5}
            value={systemInstructions}
            onChange={e => setSystemInstructions(e.target.value)}
            placeholder="Custom instructions for Rex AI..."
            className="w-full p-3.5 rounded-xl border border-theme-subtle bg-surface text-primary text-xs leading-relaxed focus:outline-none focus:border-rex-500 focus:ring-2 focus:ring-rex-500/20 font-mono shadow-xs transition-all"
          />
        </div>
      </GlassCard>

      {/* --- SECTION 2: OPERATIONAL & BUSINESS VARIABLES --- */}
      <GlassCard className="p-6 border border-theme-subtle rounded-2xl shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-theme-subtle pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Factory size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-primary">
              Operational ERP Variables & Defaults
            </h2>
            <p className="text-xs text-muted">
              Configure system-wide lead times, quotation expiry parameters, and inventory warning levels.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Quotation Validity */}
          <div className="space-y-1.5 bg-surface2/30 p-4 rounded-xl border border-theme-subtle">
            <label className="block text-xs font-bold text-secondary flex items-center gap-1.5">
              <Clock size={13} className="text-muted" /> Default Quote Validity
            </label>
            <div className="flex items-baseline gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={quoteValidity}
                onChange={e => setQuoteValidity(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg border border-theme-subtle bg-surface font-mono font-bold text-sm text-primary focus:outline-none focus:border-rex-500"
              />
              <span className="text-xs text-muted">Days</span>
            </div>
            <p className="text-[10px] text-muted leading-tight">Standard validity period auto-filled in new quotation drafts.</p>
          </div>

          {/* Manufacturing Lead Time */}
          <div className="space-y-1.5 bg-surface2/30 p-4 rounded-xl border border-theme-subtle">
            <label className="block text-xs font-bold text-secondary flex items-center gap-1.5">
              <Factory size={13} className="text-muted" /> Standard Lead Time
            </label>
            <div className="flex items-baseline gap-2">
              <input
                type="number"
                min="1"
                max="180"
                value={leadTime}
                onChange={e => setLeadTime(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg border border-theme-subtle bg-surface font-mono font-bold text-sm text-primary focus:outline-none focus:border-rex-500"
              />
              <span className="text-xs text-muted">Working Days</span>
            </div>
            <p className="text-[10px] text-muted leading-tight">Default delivery period promised on quotation terms.</p>
          </div>

          {/* Low Stock Warning Threshold */}
          <div className="space-y-1.5 bg-surface2/30 p-4 rounded-xl border border-theme-subtle">
            <label className="block text-xs font-bold text-secondary flex items-center gap-1.5">
              <AlertCircle size={13} className="text-muted" /> Low Stock Warning Level
            </label>
            <div className="flex items-baseline gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={lowStockWarning}
                onChange={e => setLowStockWarning(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg border border-theme-subtle bg-surface font-mono font-bold text-sm text-primary focus:outline-none focus:border-rex-500"
              />
              <span className="text-xs text-muted">% of Reorder Point</span>
            </div>
            <p className="text-[10px] text-muted leading-tight">Trigger for dashboard low stock alerts and notification badges.</p>
          </div>

          {/* Standard Credit Days */}
          <div className="space-y-1.5 bg-surface2/30 p-4 rounded-xl border border-theme-subtle">
            <label className="block text-xs font-bold text-secondary flex items-center gap-1.5">
              <Clock size={13} className="text-muted" /> Standard Customer Credit
            </label>
            <div className="flex items-baseline gap-2">
              <input
                type="number"
                min="0"
                max="120"
                value={standardCreditDays}
                onChange={e => setStandardCreditDays(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg border border-theme-subtle bg-surface font-mono font-bold text-sm text-primary focus:outline-none focus:border-rex-500"
              />
              <span className="text-xs text-muted">Days</span>
            </div>
            <p className="text-[10px] text-muted leading-tight">Default payment terms for new registered customers.</p>
          </div>

          {/* Work Order Title Prefix */}
          <div className="space-y-1.5 bg-surface2/30 p-4 rounded-xl border border-theme-subtle">
            <label className="block text-xs font-bold text-secondary flex items-center gap-1.5">
              <Database size={13} className="text-muted" /> Work Order Prefix
            </label>
            <div className="flex items-baseline gap-2">
              <input
                type="text"
                value={woPrefix}
                onChange={e => setWoPrefix(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg border border-theme-subtle bg-surface font-mono font-bold text-sm text-primary focus:outline-none focus:border-rex-500"
              />
              <span className="text-xs text-muted">Code</span>
            </div>
            <p className="text-[10px] text-muted leading-tight">Prefix formatted into new production job order codes.</p>
          </div>
        </div>
      </GlassCard>

      {/* --- SECTION 3: SENDER EMAIL & OUTGOING SMTP SETTINGS --- */}
      <EmailSettingsManager />

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="primary"
          icon={Save}
          onClick={handleSave}
          disabled={saving || loading}
          className="font-bold text-xs px-6 py-2.5 shadow-lg shadow-rex-500/20"
        >
          {saving ? 'Saving...' : 'Save All Variables'}
        </Button>
      </div>
    </div>
  );
};
