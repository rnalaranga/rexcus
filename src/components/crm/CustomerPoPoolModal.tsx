import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, FileCheck, Plus, UploadCloud, Eye, Trash2, Search, 
  Building2, Calendar, FileText, CheckCircle2, AlertCircle, 
  ExternalLink, ArrowRight, Clock, RefreshCw, Paperclip
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, openDataUriOrUrl, resolveFileUrl } from '@/lib/utils';
import { 
  CustomerPoPoolItem, 
  fetchCustomerPoPool, 
  createCustomerPoPoolItem, 
  deleteCustomerPoPoolItem, 
  unassignCustomerPoFromPool,
  uploadFileToStorage 
} from '@/lib/api';
import { useCustomers } from '@/hooks/useData';

interface CustomerPoPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If in picker mode (e.g. from Quotation or Sales Order)
  pickerMode?: boolean;
  targetCustomerName?: string;
  targetCustomerId?: string;
  onSelectPo?: (po: CustomerPoPoolItem) => void;
}

export const CustomerPoPoolModal: React.FC<CustomerPoPoolModalProps> = ({
  isOpen,
  onClose,
  pickerMode = false,
  targetCustomerName,
  targetCustomerId,
  onSelectPo
}) => {
  const { toast, showConfirm } = useDialog();
  const { user } = useAuth();
  const { data: customers = [] } = useCustomers();

  const [poolItems, setPoolItems] = useState<CustomerPoPoolItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'assigned'>('unassigned');
  const [search, setSearch] = useState('');

  // Add PO State
  const [showAddForm, setShowAddForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    poNumber: '',
    poDate: new Date().toISOString().slice(0, 10),
    customerId: targetCustomerId || '',
    customerName: targetCustomerName || '',
    customerCompany: targetCustomerName || '',
    amount: '',
    currency: 'LKR',
    attachmentUrl: '',
    attachmentName: '',
    notes: ''
  });

  const loadPool = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomerPoPool({
        status: statusFilter,
        search: search.trim() || undefined
      });
      setPoolItems(data);
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to load PO pool', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPool();
      if (targetCustomerName || targetCustomerId) {
        setFormData(prev => ({
          ...prev,
          customerId: targetCustomerId || prev.customerId,
          customerName: targetCustomerName || prev.customerName,
          customerCompany: targetCustomerName || prev.customerCompany
        }));
      }
    }
  }, [isOpen, statusFilter]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast('File size must be under 20MB', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawDataUri = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          attachmentUrl: rawDataUri,
          attachmentName: file.name
        }));

        try {
          const uploaded = await uploadFileToStorage(rawDataUri, file.name, 'customer_pos');
          if (uploaded?.url) {
            setFormData(prev => ({
              ...prev,
              attachmentUrl: uploaded.url
            }));
            toast('PO document uploaded successfully', 'success');
          }
        } catch (err) {
          console.warn('Storage upload fallback:', err);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast('Error reading file: ' + err.message, 'error');
      setIsUploading(false);
    }
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.poNumber.trim()) {
      toast('Please enter a valid Customer PO Number', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const matchedCust = customers.find((c: any) => c.id === formData.customerId || c.company === formData.customerCompany);
      const newPo = await createCustomerPoPoolItem({
        poNumber: formData.poNumber.trim(),
        poDate: formData.poDate,
        customerId: matchedCust?.id || formData.customerId || undefined,
        customerName: matchedCust?.name || formData.customerName || undefined,
        customerCompany: matchedCust?.company || formData.customerCompany || undefined,
        amount: formData.amount ? Number(formData.amount) : 0,
        currency: formData.currency || 'LKR',
        attachmentUrl: formData.attachmentUrl || undefined,
        attachmentName: formData.attachmentName || undefined,
        notes: formData.notes?.trim() || undefined,
        receivedBy: user?.name || user?.username || 'Sales Team'
      });

      toast(`PO #${newPo.poNumber} added to pool successfully!`, 'success');
      setShowAddForm(false);
      setFormData({
        poNumber: '',
        poDate: new Date().toISOString().slice(0, 10),
        customerId: targetCustomerId || '',
        customerName: targetCustomerName || '',
        customerCompany: targetCustomerName || '',
        amount: '',
        currency: 'LKR',
        attachmentUrl: '',
        attachmentName: '',
        notes: ''
      });
      loadPool();

      // If in picker mode, auto select the freshly added PO
      if (pickerMode && onSelectPo) {
        onSelectPo(newPo);
        onClose();
      }
    } catch (err: any) {
      toast(err.message || 'Failed to add PO', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (po: CustomerPoPoolItem) => {
    if (await showConfirm(`Delete PO #${po.poNumber} from pool? This cannot be undone.`, 'Delete PO from Pool')) {
      try {
        await deleteCustomerPoPoolItem(po.id);
        toast(`PO #${po.poNumber} removed`, 'success');
        loadPool();
      } catch (err: any) {
        toast(err.message || 'Failed to delete PO', 'error');
      }
    }
  };

  const handleUnassign = async (po: CustomerPoPoolItem) => {
    if (await showConfirm(`Return PO #${po.poNumber} back to unassigned pool?`, 'Unassign PO')) {
      try {
        await unassignCustomerPoFromPool(po.id);
        toast(`PO #${po.poNumber} returned to pool`, 'success');
        loadPool();
      } catch (err: any) {
        toast(err.message || 'Failed to unassign PO', 'error');
      }
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-5 bg-white/60 dark:bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-none overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-surface2/60 border-b border-theme-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400">
              <FileCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-primary tracking-tight">
                  {pickerMode ? 'Pick Customer PO from Pool' : 'Customer PO Pool (Buffer Hub)'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold uppercase">
                  {poolItems.filter(p => p.status === 'unassigned').length} Available
                </span>
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                {pickerMode 
                  ? `Select a received PO to assign to ${targetCustomerName || 'this record'} or add a new one.`
                  : 'Central repository of customer POs received prior to quotation or order creation.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!showAddForm && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setShowAddForm(true)}
                className="text-xs h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Add PO to Pool
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface2 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Add PO Form Drawer */}
        {showAddForm && (
          <form onSubmit={handleCreatePo} className="p-4 bg-surface2/80 border-b border-theme-subtle animate-fade-in shrink-0 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <Plus size={13} className="text-blue-500" /> New Customer PO Buffer Entry
              </h4>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="text-xs text-muted hover:text-primary hover:underline"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* PO Number */}
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                  PO Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PO-84920"
                  value={formData.poNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                  className="w-full h-8 px-2.5 text-xs font-mono font-bold bg-surface border border-theme-subtle focus:border-blue-500 outline-none"
                />
              </div>

              {/* PO Date */}
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                  PO Date
                </label>
                <input
                  type="date"
                  value={formData.poDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, poDate: e.target.value }))}
                  className="w-full h-8 px-2.5 text-xs font-mono bg-surface border border-theme-subtle focus:border-blue-500 outline-none"
                />
              </div>

              {/* Customer Selector / Input */}
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                  Customer / Company
                </label>
                <input
                  type="text"
                  placeholder="Customer or Company Name"
                  value={formData.customerCompany || formData.customerName}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    customerCompany: e.target.value,
                    customerName: e.target.value
                  }))}
                  list="pool-customer-options"
                  className="w-full h-8 px-2.5 text-xs bg-surface border border-theme-subtle focus:border-blue-500 outline-none"
                />
                <datalist id="pool-customer-options">
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.company || c.name} />
                  ))}
                </datalist>
              </div>

              {/* PO Value */}
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                  PO Amount / Value (Optional)
                </label>
                <div className="flex">
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="h-8 px-2 text-xs font-mono bg-surface border border-r-0 border-theme-subtle outline-none font-bold"
                  >
                    <option value="LKR">LKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full h-8 px-2.5 text-xs font-mono bg-surface border border-theme-subtle focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Upload Document */}
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                  PO Document Attachment (PDF or Image)
                </label>
                <div className="flex items-center gap-2">
                  <label className="h-8 px-3 text-xs bg-surface hover:bg-surface2 border border-theme-subtle flex items-center gap-1.5 cursor-pointer text-primary transition-colors">
                    <UploadCloud size={13} className="text-blue-500" />
                    <span>{isUploading ? 'Uploading...' : 'Choose File'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.attachmentName ? (
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 truncate flex-1 flex items-center gap-1">
                      <Paperclip size={12} /> {formData.attachmentName}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted italic">No document attached yet</span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Remarks or scope details for this PO..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full h-8 px-2.5 text-xs bg-surface border border-theme-subtle focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button 
                variant="ghost" 
                size="sm" 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="text-xs h-7"
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                type="submit" 
                disabled={submitting || isUploading}
                className="text-xs h-7 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {submitting ? 'Saving...' : 'Save to PO Pool'}
              </Button>
            </div>
          </form>
        )}

        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-theme-subtle flex flex-wrap items-center justify-between gap-3 bg-surface shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-2.5 text-muted" />
              <input
                type="text"
                placeholder="Search PO #, Customer, Notes, Order/Quote ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadPool()}
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-surface border border-theme-subtle focus:border-blue-500 outline-none"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPool}
              className="h-8 px-2.5 text-xs border-theme-subtle"
              title="Refresh"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex bg-surface2 border border-theme-subtle p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('unassigned')}
                className={`px-3 py-1 text-[11px] font-semibold transition-colors ${statusFilter === 'unassigned' ? 'bg-blue-600 text-white font-bold' : 'text-muted hover:text-primary'}`}
              >
                Available ({poolItems.filter(p => p.status === 'unassigned').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('assigned')}
                className={`px-3 py-1 text-[11px] font-semibold transition-colors ${statusFilter === 'assigned' ? 'bg-blue-600 text-white font-bold' : 'text-muted hover:text-primary'}`}
              >
                Assigned ({poolItems.filter(p => p.status === 'assigned').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 text-[11px] font-semibold transition-colors ${statusFilter === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-muted hover:text-primary'}`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* List of Pool Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted flex flex-col items-center justify-center">
              <RefreshCw size={20} className="animate-spin mb-2 text-blue-500" />
              Loading Customer PO Pool...
            </div>
          ) : poolItems.length === 0 ? (
            <div className="p-12 text-center text-muted border border-dashed border-theme-subtle m-2">
              <FileCheck size={28} className="mx-auto mb-2 text-muted opacity-40" />
              <p className="text-xs font-semibold text-primary">No Customer POs Found</p>
              <p className="text-[11px] text-muted mt-1">
                {statusFilter === 'unassigned' 
                  ? 'All received POs have been assigned to quotations or orders.' 
                  : 'No PO entries recorded in this view.'}
              </p>
              {!showAddForm && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => setShowAddForm(true)}
                  className="mt-3 text-xs"
                >
                  Add First PO to Pool
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {poolItems.map((po) => {
                const isAssigned = po.status === 'assigned';
                const hasAttachment = Boolean(po.attachmentUrl);
                const isTargetMatch = Boolean(
                  targetCustomerName && (
                    po.customerCompany?.toLowerCase().includes(targetCustomerName.toLowerCase()) ||
                    po.customerName?.toLowerCase().includes(targetCustomerName.toLowerCase())
                  )
                );

                return (
                  <div
                    key={po.id}
                    className={`p-3 border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isTargetMatch 
                        ? 'bg-blue-500/5 border-blue-500/40 hover:bg-blue-500/10'
                        : 'bg-surface hover:bg-surface2/60 border-theme-subtle'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs text-primary">
                          {po.poNumber}
                        </span>
                        {isTargetMatch && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-bold uppercase">
                            Target Customer Match
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 border ${
                          isAssigned 
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        }`}>
                          {isAssigned ? 'ASSIGNED' : 'UNASSIGNED'}
                        </span>
                        {po.poDate && (
                          <span className="text-[11px] text-muted font-mono flex items-center gap-1">
                            <Calendar size={11} /> {formatDate(po.poDate)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                        {(po.customerCompany || po.customerName) && (
                          <span className="font-semibold text-primary flex items-center gap-1">
                            <Building2 size={12} className="text-muted" />
                            {po.customerCompany || po.customerName}
                          </span>
                        )}
                        {Number(po.amount) > 0 && (
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {formatCurrency(Number(po.amount), false, po.currency || 'LKR')}
                          </span>
                        )}
                        {po.receivedBy && (
                          <span className="text-[11px] text-muted">
                            Recvd by: {po.receivedBy}
                          </span>
                        )}
                      </div>

                      {po.notes && (
                        <p className="text-[11px] text-secondary mt-1 italic truncate">
                          "{po.notes}"
                        </p>
                      )}

                      {isAssigned && (
                        <div className="mt-1.5 pt-1.5 border-t border-theme-subtle/50 text-[10px] text-purple-700 dark:text-purple-300 flex items-center gap-2">
                          <CheckCircle2 size={12} className="text-purple-500 shrink-0" />
                          <span>
                            Linked to: {po.assignedQuoteNo ? `Quote #${po.assignedQuoteNo}` : ''} {po.assignedOrderNo ? `Sales Order #${po.assignedOrderNo}` : ''} {po.assignedAt ? `on ${formatDate(po.assignedAt)}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions on this PO */}
                    <div className="flex items-center gap-1.5 shrink-0 justify-end">
                      {hasAttachment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDataUriOrUrl(resolveFileUrl(po.attachmentUrl!), `Customer PO #${po.poNumber}`)}
                          className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                          title="View PO Document"
                        >
                          <Eye size={12} className="mr-1" /> View PO
                        </Button>
                      )}

                      {pickerMode && !isAssigned && onSelectPo && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            onSelectPo(po);
                            onClose();
                          }}
                          className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          Pick PO &rarr;
                        </Button>
                      )}

                      {isAssigned && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnassign(po)}
                          className="h-7 px-2 text-[11px] text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                          title="Return back to pool"
                        >
                          Unassign
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(po)}
                        className="h-7 px-1.5 text-xs text-muted hover:text-rose-600 hover:bg-rose-500/10"
                        title="Delete PO"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-surface2/40 border-t border-theme-subtle flex items-center justify-between text-xs text-muted shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span>POs placed in this pool can be assigned to Quotes or Sales Orders at any time.</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-7">
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
