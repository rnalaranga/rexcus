import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle, Info, Trash2, X, HelpCircle } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type DialogType = 'alert' | 'confirm' | 'success' | 'error' | 'info';
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface DialogConfig {
  id: string;
  type: DialogType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (val: boolean) => void;
}

interface ToastConfig {
  id: string;
  type: ToastType;
  message: string;
}

interface DialogContextValue {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string, options?: { confirmLabel?: string; cancelLabel?: string }) => Promise<boolean>;
  showSuccess: (message: string, title?: string) => Promise<void>;
  showError: (message: string, title?: string) => Promise<void>;
  toast: (message: string, type?: ToastType) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside <DialogProvider>');
  return ctx;
}

// ─── Icons & Colors ───────────────────────────────────────────────────────────

const DIALOG_CONFIG: Record<DialogType, { icon: React.FC<any>; iconClass: string; headerClass: string; confirmClass: string }> = {
  alert: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    headerClass: 'border-amber-500/30',
    confirmClass: 'bg-amber-600 hover:bg-amber-500 text-white',
  },
  confirm: {
    icon: HelpCircle,
    iconClass: 'text-rex-500',
    headerClass: 'border-rex-500/30',
    confirmClass: 'bg-rex-700 hover:bg-rex-600 text-white',
  },
  success: {
    icon: CheckCircle,
    iconClass: 'text-emerald-500',
    headerClass: 'border-emerald-500/30',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  },
  error: {
    icon: Trash2,
    iconClass: 'text-rose-500',
    headerClass: 'border-rose-500/30',
    confirmClass: 'bg-rose-700 hover:bg-rose-600 text-white',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500',
    headerClass: 'border-blue-500/30',
    confirmClass: 'bg-blue-600 hover:bg-blue-500 text-white',
  },
};

const TOAST_CONFIG: Record<ToastType, { icon: React.FC<any>; barClass: string; iconClass: string }> = {
  success: { icon: CheckCircle, barClass: 'bg-emerald-500', iconClass: 'text-emerald-400' },
  error:   { icon: AlertTriangle, barClass: 'bg-rose-500', iconClass: 'text-rose-400' },
  info:    { icon: Info, barClass: 'bg-blue-500', iconClass: 'text-blue-400' },
  warning: { icon: AlertTriangle, barClass: 'bg-amber-500', iconClass: 'text-amber-400' },
};

// ─── Dialog Component ─────────────────────────────────────────────────────────

const DialogRenderer: React.FC<{ dialogs: DialogConfig[]; onResolve: (id: string, val: boolean) => void }> = ({ dialogs, onResolve }) => {
  if (dialogs.length === 0) return null;
  const dialog = dialogs[dialogs.length - 1];
  const cfg = DIALOG_CONFIG[dialog.type];
  const Icon = cfg.icon;
  const isConfirm = dialog.type === 'confirm';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 animate-in fade-in duration-150" />

      {/* Dialog */}
      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-200">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
          
          {/* Accent top bar */}
          <div className="h-1 w-full" style={{ background: dialog.type === 'error' ? '#f43f5e' : dialog.type === 'success' ? '#10b981' : dialog.type === 'info' ? '#3b82f6' : dialog.type === 'confirm' ? '#dc2626' : '#f59e0b' }} />
          
          {/* Header */}
          <div className="flex items-start gap-4 p-6 pb-4 border-b border-gray-100 dark:border-zinc-800">
            <div className={`mt-0.5 p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 flex-shrink-0 ${cfg.iconClass}`}>
              <Icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">{dialog.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{dialog.message}</p>
            </div>
            {!isConfirm && (
              <button onClick={() => onResolve(dialog.id, true)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors mt-0.5 flex-shrink-0">
                <X size={18} />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-zinc-800/80">
            {isConfirm && (
              <button
                onClick={() => onResolve(dialog.id, false)}
                className="px-5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-600 border border-gray-200 dark:border-zinc-600 rounded-lg transition-all"
              >
                {dialog.cancelLabel || 'Cancel'}
              </button>
            )}
            <button
              onClick={() => onResolve(dialog.id, true)}
              className={`px-5 py-2 text-sm font-bold rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95 ${cfg.confirmClass}`}
            >
              {dialog.confirmLabel || (isConfirm ? 'Confirm' : 'OK')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Toast Component ──────────────────────────────────────────────────────────

const ToastRenderer: React.FC<{ toasts: ToastConfig[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[10000] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => {
        const cfg = TOAST_CONFIG[toast.type];
        const Icon = cfg.icon;
        return (
          <div key={toast.id} className="pointer-events-auto flex items-center gap-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl px-4 py-3 min-w-[280px] max-w-[400px] animate-in slide-in-from-right-5 fade-in duration-300 relative overflow-hidden">
            <div className={`flex-shrink-0 ${cfg.iconClass}`}>
              <Icon size={18} />
            </div>
            <p className="text-sm text-gray-900 dark:text-white flex-1 font-medium">{toast.message}</p>
            <button onClick={() => onDismiss(toast.id)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors flex-shrink-0">
              <X size={15} />
            </button>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden">
              <div className={`h-full ${cfg.barClass} animate-[shrink_3s_linear_forwards]`} />
            </div>
          </div>
        );
      })}
    </div>,
    document.body
  );
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogs, setDialogs] = useState<DialogConfig[]>([]);
  const [toasts, setToasts] = useState<ToastConfig[]>([]);
  const counterRef = useRef(0);

  const genId = () => `dialog-${++counterRef.current}`;

  const createDialog = useCallback((type: DialogType, message: string, title: string, opts?: { confirmLabel?: string; cancelLabel?: string }): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = genId();
      setDialogs(d => [...d, { id, type, title, message, resolve, ...opts }]);
    });
  }, []);

  const resolveDialog = useCallback((id: string, val: boolean) => {
    setDialogs(d => {
      const found = d.find(x => x.id === id);
      if (found) found.resolve(val);
      return d.filter(x => x.id !== id);
    });
  }, []);

  const showAlert = useCallback(async (message: string, title = 'Notice') => {
    await createDialog('alert', message, title);
  }, [createDialog]);

  const showConfirm = useCallback((message: string, title = 'Confirm Action', opts?: { confirmLabel?: string; cancelLabel?: string }) => {
    return createDialog('confirm', message, title, opts);
  }, [createDialog]);

  const showSuccess = useCallback(async (message: string, title = 'Success') => {
    await createDialog('success', message, title);
  }, [createDialog]);

  const showError = useCallback(async (message: string, title = 'Error') => {
    await createDialog('error', message, title);
  }, [createDialog]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = genId();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showSuccess, showError, toast }}>
      {children}
      <DialogRenderer dialogs={dialogs} onResolve={resolveDialog} />
      <ToastRenderer toasts={toasts} onDismiss={(id) => setToasts(t => t.filter(x => x.id !== id))} />
    </DialogContext.Provider>
  );
};
