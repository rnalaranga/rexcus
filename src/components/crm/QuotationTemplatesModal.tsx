import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Search, 
  LayoutTemplate, 
  Clock, 
  Truck, 
  FileText, 
  ArrowRight, 
  X, 
  Copy,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface QuotationTemplate {
  id: string;
  name: string;
  description?: string;
  subject?: string;
  items?: any[];
  terms?: string;
  validity?: string;
  delivery?: string;
  taxProfileId?: string;
  boms?: any[];
  data?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuotationTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuotationData?: {
    subject?: string;
    custItems?: any[];
    custTerms?: string;
    custValidity?: string;
    custDelivery?: string;
    selectedProfileId?: string;
    boms?: any[];
    fullSnapshot?: any;
  };
  onApplyTemplate?: (template: QuotationTemplate, mode: 'replace' | 'append') => void;
  onSelectForNewQuote?: (template: QuotationTemplate) => void;
}

export const QuotationTemplatesModal: React.FC<QuotationTemplatesModalProps> = ({
  isOpen,
  onClose,
  currentQuotationData,
  onApplyTemplate,
  onSelectForNewQuote
}) => {
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<QuotationTemplate | null>(null);
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');

  // Form State for creating/editing template
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formValidity, setFormValidity] = useState('30 Days');
  const [formDelivery, setFormDelivery] = useState('2-3 Weeks');
  const [formTerms, setFormTerms] = useState('');
  const [formItems, setFormItems] = useState<any[]>([]);
  const [formTaxProfileId, setFormTaxProfileId] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3000/api/quotation-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
      }
    } catch (err) {
      console.error('Failed to load quotation templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setActiveTab('list');
      setFeedback(null);
    }
  }, [isOpen]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Open create form pre-filled with current quotation data
  const handleOpenSaveCurrentAsTemplate = () => {
    setFormName(currentQuotationData?.subject ? `Template - ${currentQuotationData.subject.slice(0, 30)}` : 'My Custom Quotation Template');
    setFormDesc('Saved from current quotation items & terms');
    setFormSubject(currentQuotationData?.subject || '');
    setFormValidity(currentQuotationData?.custValidity || '30 Days');
    setFormDelivery(currentQuotationData?.custDelivery || '2-3 Weeks');
    setFormTerms(currentQuotationData?.custTerms || '');
    setFormTaxProfileId(currentQuotationData?.selectedProfileId || '');
    setFormItems(
      (currentQuotationData?.custItems || []).map(item => ({
        desc: item.desc || '',
        qty: Number(item.qty) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        unit: item.unit || 'pcs',
        note: item.note || ''
      }))
    );
    setActiveTab('create');
  };

  // Open fresh blank template form
  const handleOpenBlankCreate = () => {
    setFormName('');
    setFormDesc('');
    setFormSubject('');
    setFormValidity('30 Days');
    setFormDelivery('2-3 Weeks');
    setFormTerms('1. Payment: 30 days from delivery.\n2. Taxes: Applicable taxes extra as per regulations.\n3. Delivery: As per schedule.');
    setFormItems([
      { desc: 'Custom Fabricated Component as per specification', qty: 1, unitPrice: 0, unit: 'pcs', note: '' }
    ]);
    setFormTaxProfileId('');
    setActiveTab('create');
  };

  // Open edit template form
  const handleOpenEdit = (tpl: QuotationTemplate) => {
    setSelectedTemplate(tpl);
    setFormName(tpl.name || '');
    setFormDesc(tpl.description || '');
    setFormSubject(tpl.subject || '');
    setFormValidity(tpl.validity || '30 Days');
    setFormDelivery(tpl.delivery || '2-3 Weeks');
    setFormTerms(tpl.terms || '');
    setFormTaxProfileId(tpl.taxProfileId || '');
    setFormItems(
      (tpl.items || []).map((it: any) => ({
        desc: it.desc || '',
        qty: Number(it.qty) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        unit: it.unit || 'pcs',
        note: it.note || ''
      }))
    );
    setActiveTab('edit');
  };

  const handleSaveTemplate = async () => {
    if (!formName.trim()) {
      showToast('error', 'Please enter a template name.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDesc.trim(),
        subject: formSubject.trim(),
        validity: formValidity.trim(),
        delivery: formDelivery.trim(),
        terms: formTerms.trim(),
        taxProfileId: formTaxProfileId || null,
        items: formItems.filter(it => it.desc.trim() !== '')
      };

      if (activeTab === 'edit' && selectedTemplate) {
        const res = await fetch(`http://localhost:3000/api/quotation-templates/${selectedTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update template');
        showToast('success', 'Template updated successfully!');
      } else {
        const res = await fetch('http://localhost:3000/api/quotation-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create template');
        showToast('success', 'Template created successfully!');
      }

      await fetchTemplates();
      setActiveTab('list');
    } catch (err: any) {
      showToast('error', err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return;
    try {
      const res = await fetch(`http://localhost:3000/api/quotation-templates/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete template');
      showToast('success', 'Template deleted successfully');
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete');
    }
  };

  const handleAddItemRow = () => {
    setFormItems(prev => [
      ...prev,
      { desc: '', qty: 1, unitPrice: 0, unit: 'pcs', note: '' }
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    setFormItems(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const filteredTemplates = templates.filter(t => 
    (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.subject || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Quotation Templates" 
      size="xl"
    >
      <div className="flex flex-col h-[75vh] max-h-[750px] -m-6">
        
        {/* Header Tabs & Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-theme-subtle bg-surface/50 backdrop-blur shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'list' 
                  ? 'bg-rex-500 text-white shadow-xs' 
                  : 'text-muted hover:text-primary hover:bg-surface2'
              }`}
            >
              <LayoutTemplate size={14} /> Saved Templates ({templates.length})
            </button>
            <button
              onClick={handleOpenBlankCreate}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'create' 
                  ? 'bg-rex-500 text-white shadow-xs' 
                  : 'text-muted hover:text-primary hover:bg-surface2'
              }`}
            >
              <Plus size={14} /> Create Template
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => {
                onClose();
                window.location.href = '/crm/quotations/new?mode=template';
              }}
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white border-none shadow-xs"
            >
              Build in Quotation Builder
            </Button>
            {currentQuotationData && (
              <Button
                variant="ghost"
                size="sm"
                icon={Bookmark}
                onClick={handleOpenSaveCurrentAsTemplate}
                className="text-xs text-rex-500 border border-rex-500/30 hover:bg-rex-500/10"
              >
                Save Current Quote as Template
              </Button>
            )}
          </div>
        </div>

        {/* Feedback message banner */}
        {feedback && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 shrink-0 ${
            feedback.type === 'success' 
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-b border-emerald-500/20' 
              : 'bg-red-500/15 text-red-600 dark:text-red-400 border-b border-red-500/20'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface/20 custom-scrollbar">
          
          {/* TAB 1: LIST TEMPLATES */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              
              {/* Search & Apply Mode Control */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search templates by name, subject, or description..."
                    className="w-full bg-surface border border-theme-subtle rounded-xl pl-9 pr-4 py-2 text-xs text-primary focus:border-rex-500 outline-none"
                  />
                </div>

                {onApplyTemplate && (
                  <div className="flex items-center gap-2 shrink-0 bg-surface border border-theme-subtle px-2 py-1 rounded-xl text-xs">
                    <span className="text-[11px] font-bold text-muted uppercase">Apply Mode:</span>
                    <button
                      onClick={() => setApplyMode('replace')}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                        applyMode === 'replace' ? 'bg-rex-500 text-white' : 'text-muted hover:text-primary'
                      }`}
                    >
                      Replace Items
                    </button>
                    <button
                      onClick={() => setApplyMode('append')}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                        applyMode === 'append' ? 'bg-rex-500 text-white' : 'text-muted hover:text-primary'
                      }`}
                    >
                      Append Items
                    </button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="p-12 text-center text-muted animate-pulse">Loading quotation templates...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-theme-subtle rounded-2xl">
                  <Bookmark size={32} className="mx-auto text-muted mb-3 opacity-40" />
                  <h4 className="text-sm font-bold text-primary mb-1">No Quotation Templates Found</h4>
                  <p className="text-xs text-muted mb-4 max-w-sm mx-auto">
                    Create reusable quotation templates with pre-configured line items, subjects, and terms to speed up quotation preparation.
                  </p>
                  <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenBlankCreate}>
                    Create Your First Template
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map(tpl => {
                    const itemCount = (tpl.items || []).length;
                    return (
                      <div 
                        key={tpl.id}
                        className="bg-surface border border-theme-subtle hover:border-rex-500/50 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-rex-500 bg-rex-500/10 px-2 py-0.5 rounded uppercase">
                                {tpl.id}
                              </span>
                              <h3 className="text-sm font-bold text-primary mt-1.5 leading-snug group-hover:text-rex-500 transition-colors">
                                {tpl.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  onClose();
                                  window.location.href = `/crm/quotations/new?mode=template&editTemplateId=${tpl.id}`;
                                }}
                                className="p-1.5 hover:bg-purple-500/10 rounded-lg text-muted hover:text-purple-600 transition-colors"
                                title="Edit in Full Quotation Builder"
                              >
                                <LayoutTemplate size={13} />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(tpl)}
                                className="p-1.5 hover:bg-surface2 rounded-lg text-muted hover:text-primary transition-colors"
                                title="Quick Edit Properties"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted hover:text-red-500 transition-colors"
                                title="Delete Template"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {tpl.description && (
                            <p className="text-[11px] text-muted line-clamp-2 mb-3">
                              {tpl.description}
                            </p>
                          )}

                          {tpl.subject && (
                            <div className="text-[11px] bg-surface2/60 border border-theme-subtle/50 rounded-lg p-2 mb-3">
                              <span className="font-bold text-muted uppercase text-[9px] block mb-0.5">Subject</span>
                              <p className="font-semibold text-primary truncate">{tpl.subject}</p>
                            </div>
                          )}

                          {/* Quick Badges */}
                          <div className="flex flex-wrap gap-2 text-[10px] text-muted mb-4">
                            <span className="flex items-center gap-1 bg-surface2 px-2 py-0.5 rounded-md font-medium">
                              <Layers size={11} className="text-rex-500" /> {itemCount} Item{itemCount !== 1 ? 's' : ''}
                            </span>
                            {Boolean((tpl.boms && tpl.boms.length > 0) || (tpl.data?.boms && tpl.data.boms.length > 0)) && (
                              <span className="flex items-center gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-md font-semibold">
                                <Bookmark size={11} /> {(tpl.boms?.length || tpl.data?.boms?.length)} BOM(s)
                              </span>
                            )}
                            {tpl.validity && (
                              <span className="flex items-center gap-1 bg-surface2 px-2 py-0.5 rounded-md font-medium">
                                <Clock size={11} className="text-amber-500" /> {tpl.validity}
                              </span>
                            )}
                            {tpl.delivery && (
                              <span className="flex items-center gap-1 bg-surface2 px-2 py-0.5 rounded-md font-medium">
                                <Truck size={11} className="text-blue-500" /> {tpl.delivery}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="pt-3 border-t border-theme-subtle flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted font-mono">
                            {tpl.updatedAt ? new Date(tpl.updatedAt).toLocaleDateString() : ''}
                          </span>

                          <div className="flex items-center gap-2">
                            {onApplyTemplate && (
                              <button
                                onClick={() => {
                                  onApplyTemplate(tpl, applyMode);
                                  onClose();
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rex-500 hover:bg-rex-600 text-white shadow-xs transition-colors"
                              >
                                <Check size={13} /> Apply to Quote
                              </button>
                            )}

                            {onSelectForNewQuote && (
                              <button
                                onClick={() => {
                                  onSelectForNewQuote(tpl);
                                  onClose();
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rex-500 hover:bg-rex-600 text-white shadow-xs transition-colors"
                              >
                                <span>Use in New Quote</span> <ArrowRight size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE / EDIT TEMPLATE FORM */}
          {(activeTab === 'create' || activeTab === 'edit') && (
            <div className="space-y-6 max-w-3xl mx-auto">
              
              <div className="flex items-center justify-between pb-2 border-b border-theme-subtle">
                <div>
                  <h3 className="text-sm font-bold text-primary">
                    {activeTab === 'edit' ? `Edit Template: ${selectedTemplate?.name}` : 'Create New Quotation Template'}
                  </h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    Define standardized subject, delivery timeline, terms & conditions, and default line items.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('list')}
                  className="p-1.5 hover:bg-surface2 rounded-lg text-muted hover:text-primary transition-colors text-xs flex items-center gap-1"
                >
                  <X size={14} /> Cancel
                </button>
              </div>

              {/* Template Meta Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Standard CNC Precision Machining Template"
                    className="w-full bg-surface border border-theme-subtle rounded-xl px-3.5 py-2.5 text-xs text-primary focus:border-rex-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                    Description / Internal Notes
                  </label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    placeholder="Brief description of when this template should be used..."
                    className="w-full bg-surface border border-theme-subtle rounded-xl px-3.5 py-2 text-xs text-primary focus:border-rex-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                    Default Subject
                  </label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    placeholder="e.g. Quotation for Precision CNC Machining & Fabrication"
                    className="w-full bg-surface border border-theme-subtle rounded-xl px-3.5 py-2 text-xs text-primary focus:border-rex-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                    Default Validity
                  </label>
                  <input
                    type="text"
                    value={formValidity}
                    onChange={e => setFormValidity(e.target.value)}
                    placeholder="e.g. 30 Days"
                    className="w-full bg-surface border border-theme-subtle rounded-xl px-3.5 py-2 text-xs text-primary focus:border-rex-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                    Default Delivery
                  </label>
                  <input
                    type="text"
                    value={formDelivery}
                    onChange={e => setFormDelivery(e.target.value)}
                    placeholder="e.g. 2-3 Weeks"
                    className="w-full bg-surface border border-theme-subtle rounded-xl px-3.5 py-2 text-xs text-primary focus:border-rex-500 outline-none"
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div className="border border-theme-subtle rounded-xl p-4 bg-surface/40">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Default Line Items ({formItems.length})</h4>
                    <p className="text-[10px] text-muted">Pre-configure items that appear automatically when applying this template</p>
                  </div>
                  <Button variant="ghost" size="sm" icon={Plus} onClick={handleAddItemRow} className="text-xs">
                    Add Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-surface p-2.5 rounded-lg border border-theme-subtle/70">
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={item.desc}
                          onChange={e => handleItemChange(idx, 'desc', e.target.value)}
                          placeholder="Item Description..."
                          className="w-full bg-surface2 border border-theme-subtle/50 rounded px-2.5 py-1 text-xs text-primary focus:border-rex-500 outline-none"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <input
                              type="number"
                              value={item.qty}
                              onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                              placeholder="Qty"
                              className="w-full bg-surface2 border border-theme-subtle/50 rounded px-2 py-1 text-xs text-primary text-center focus:border-rex-500 outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                              placeholder="Unit (pcs/sets)"
                              className="w-full bg-surface2 border border-theme-subtle/50 rounded px-2 py-1 text-xs text-primary text-center focus:border-rex-500 outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                              placeholder="Unit Price (LKR)"
                              className="w-full bg-surface2 border border-theme-subtle/50 rounded px-2 py-1 text-xs text-primary text-right focus:border-rex-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1 hover:bg-red-500/10 rounded text-muted hover:text-red-500 transition-colors mt-0.5"
                        title="Remove Item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {formItems.length === 0 && (
                    <div className="text-center py-4 text-xs text-muted border border-dashed border-theme-subtle rounded-lg">
                      No items yet. Click &quot;Add Item&quot; to configure default line items.
                    </div>
                  )}
                </div>
              </div>

              {/* Terms and Conditions Section */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Default Terms & Conditions
                </label>
                <textarea
                  rows={4}
                  value={formTerms}
                  onChange={e => setFormTerms(e.target.value)}
                  placeholder="1. Payment terms...&#10;2. Delivery terms...&#10;3. Warranty terms..."
                  className="w-full bg-surface border border-theme-subtle rounded-xl p-3 text-xs text-primary focus:border-rex-500 outline-none font-sans leading-relaxed"
                />
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-theme-subtle">
                <Button variant="ghost" onClick={() => setActiveTab('list')}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  icon={Save} 
                  onClick={handleSaveTemplate} 
                  disabled={saving}
                >
                  {saving ? 'Saving...' : activeTab === 'edit' ? 'Update Template' : 'Save Template'}
                </Button>
              </div>

            </div>
          )}

        </div>

      </div>
    </Modal>
  );
};
