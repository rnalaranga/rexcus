import React from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Paperclip, ExternalLink } from 'lucide-react';
import { resolveFileUrl } from '@/lib/utils';

interface AttachmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  isOpen,
  onClose,
  url,
  title = 'Attachment Preview',
}) => {
  if (!isOpen || !url) return null;

  const resolvedUrl = resolveFileUrl(url) || url;
  const isPdf =
    resolvedUrl.toLowerCase().includes('.pdf') ||
    resolvedUrl.startsWith('data:application/pdf');

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-theme rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-theme-subtle bg-surface2/70">
          <div className="flex items-center gap-2 min-w-0">
            <Paperclip size={16} className="text-amber-500 shrink-0" />
            <h3 className="text-sm font-bold text-primary truncate">{title}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-surface border border-theme-subtle text-primary hover:bg-surface2 transition-colors"
            >
              <ExternalLink size={13} /> Open
            </a>
            <a
              href={resolvedUrl}
              download={title || 'attachment'}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              <Download size={13} /> Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-muted hover:text-primary rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-slate-950/5 dark:bg-slate-950/40 flex items-center justify-center min-h-[300px]">
          {isPdf ? (
            <iframe
              src={resolvedUrl}
              title={title}
              className="w-full h-[70vh] rounded border border-theme-subtle bg-white"
            />
          ) : (
            <img
              src={resolvedUrl}
              alt={title}
              className="max-w-full max-h-[72vh] object-contain rounded shadow-md"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
