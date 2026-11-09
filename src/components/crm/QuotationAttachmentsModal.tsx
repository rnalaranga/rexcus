import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Paperclip, FileText, Image as ImageIcon, Eye, Download, 
  ExternalLink, Layers, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { openDataUriOrUrl, downloadDataUriOrUrl, resolveFileUrl } from '@/lib/utils';
import { QuotationAttachmentItem } from './QuotationAttachmentsGallery';

interface QuotationAttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationNo: string;
  attachments: QuotationAttachmentItem[];
  customerName?: string;
}

export const QuotationAttachmentsModal: React.FC<QuotationAttachmentsModalProps> = ({
  isOpen,
  onClose,
  quotationNo,
  attachments = [],
  customerName
}) => {
  const [selectedAttachment, setSelectedAttachment] = useState<QuotationAttachmentItem | null>(null);

  if (!isOpen) return null;

  const currentPreview = selectedAttachment || attachments[0] || null;

  const isImage = (att: QuotationAttachmentItem | null) => {
    if (!att) return false;
    const src = att.dataUrl || att.url || '';
    const type = att.type || '';
    const name = att.name || '';
    return Boolean(
      type.includes('image') ||
      src.startsWith('data:image/') ||
      name.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) ||
      src.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i)
    );
  };

  const isPdf = (att: QuotationAttachmentItem | null) => {
    if (!att) return false;
    const src = att.dataUrl || att.url || '';
    const type = att.type || '';
    const name = att.name || '';
    return Boolean(
      type.includes('pdf') ||
      src.startsWith('data:application/pdf') ||
      name.match(/\.pdf($|\?)/i) ||
      src.match(/\.pdf($|\?)/i)
    );
  };

  const handleOpenInNewTab = (att: QuotationAttachmentItem | null) => {
    if (!att) return;
    const raw = att.dataUrl || att.url;
    if (!raw) return;
    openDataUriOrUrl(resolveFileUrl(raw), att.name);
  };

  const handleDownload = (att: QuotationAttachmentItem | null) => {
    if (!att) return;
    const raw = att.dataUrl || att.url;
    if (!raw) return;
    downloadDataUriOrUrl(resolveFileUrl(raw), att.name || 'quotation_attachment');
  };

  const previewSrc = currentPreview ? resolveFileUrl(currentPreview.dataUrl || currentPreview.url || '') : '';
  const isImg = isImage(currentPreview);
  const isDocPdf = isPdf(currentPreview);

  return createPortal(
    <div 
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5 bg-white/60 dark:bg-black/65 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl bg-surface/95 backdrop-blur-xl border border-theme shadow-2xl rounded-none flex flex-col max-h-[92vh] h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme-subtle bg-surface2/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <Paperclip size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-primary tracking-tight">
                  Quotation Attachments & Drawings
                </h2>
                <span className="font-mono text-xs font-bold text-rex-600 dark:text-rex-400 px-1.5 py-0.5 bg-rex-500/10 border border-rex-500/20">
                  {quotationNo}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
                  {attachments.length} {attachments.length === 1 ? 'Attachment' : 'Attachments'}
                </span>
              </div>
              {customerName && (
                <p className="text-xs text-muted truncate mt-0.5">
                  Client: <span className="text-secondary font-medium">{customerName}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentPreview && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenInNewTab(currentPreview)}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 p-1.5 h-auto flex items-center gap-1"
                  title="Open in new window"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">New Tab</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(currentPreview)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 p-1.5 h-auto flex items-center gap-1"
                  title="Download File"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface2 transition-colors cursor-pointer ml-1"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {attachments.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface">
            <div className="w-14 h-14 bg-surface2 rounded-none flex items-center justify-center text-muted mb-3 border border-theme-subtle">
              <Paperclip size={24} />
            </div>
            <h3 className="text-sm font-bold text-primary">No Attachments Found</h3>
            <p className="text-xs text-muted mt-1 max-w-sm">
              There are no drawings or files attached to this quotation. You can add attachments anytime from the Quotation Builder.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-surface">
            {/* Left Sidebar: Attachments List */}
            <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-theme-subtle bg-surface2/30 flex flex-col overflow-hidden max-h-48 md:max-h-full">
              <div className="px-3.5 py-2 text-[10px] font-bold text-muted uppercase tracking-wider border-b border-theme-subtle/50 bg-surface2/60 shrink-0">
                Attached Documents ({attachments.length})
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-theme-subtle/40 p-1.5 space-y-1">
                {attachments.map((att, idx) => {
                  const isCur = (currentPreview?.id || currentPreview?.name) === (att.id || att.name);
                  const attImg = isImage(att);
                  const attPdf = isPdf(att);
                  const rawSrc = att.dataUrl || att.url;
                  const thumbSrc = rawSrc ? resolveFileUrl(rawSrc) : '';

                  return (
                    <button
                      key={att.id || idx}
                      type="button"
                      onClick={() => setSelectedAttachment(att)}
                      className={`w-full text-left p-2.5 flex items-center gap-2.5 transition-all cursor-pointer rounded-none border ${
                        isCur 
                          ? 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-2xs' 
                          : 'bg-surface hover:bg-surface2/70 border-theme-subtle/60 text-primary'
                      }`}
                    >
                      {/* Icon / Thumbnail */}
                      <div className="w-10 h-10 shrink-0 bg-surface2 border border-theme-subtle flex items-center justify-center overflow-hidden">
                        {attImg && thumbSrc ? (
                          <img src={thumbSrc} alt={att.name} className="w-full h-full object-cover" />
                        ) : attPdf ? (
                          <div className="flex flex-col items-center justify-center text-rose-500">
                            <FileText size={16} />
                            <span className="text-[7px] font-mono font-bold uppercase">PDF</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-amber-500">
                            <Paperclip size={16} />
                            <span className="text-[7px] font-mono font-bold uppercase">FILE</span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold block truncate" title={att.name}>
                          {att.name || `Attachment #${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] font-mono px-1 py-0.2 border uppercase ${
                            attPdf 
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                              : attImg 
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
                                : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                          }`}>
                            {attPdf ? 'PDF' : attImg ? 'IMG' : 'DOC'}
                          </span>
                          {att.source && (
                            <span className="text-[9px] text-muted truncate max-w-[120px]" title={att.source}>
                              {att.source}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight size={14} className={`shrink-0 transition-transform ${isCur ? 'text-blue-500 translate-x-0.5' : 'text-muted/40'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Active File Preview */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-surface/50">
              {currentPreview ? (
                <>
                  {/* File Metadata Bar */}
                  <div className="px-4 py-2 bg-surface2/40 border-b border-theme-subtle flex items-center justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-primary block truncate">
                        {currentPreview.name}
                      </span>
                      <span className="text-[11px] font-mono text-muted">
                        Scope: {currentPreview.source || 'Quotation Attachment'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenInNewTab(currentPreview)}
                        className="text-xs h-7 px-2.5"
                      >
                        <ExternalLink size={12} className="mr-1" /> Open
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownload(currentPreview)}
                        className="text-xs h-7 px-2.5 bg-rex-600 hover:bg-rex-700"
                      >
                        <Download size={12} className="mr-1" /> Download
                      </Button>
                    </div>
                  </div>

                  {/* Preview Container */}
                  <div className="flex-1 p-3 sm:p-4 overflow-auto flex items-center justify-center bg-zinc-950/5 dark:bg-black/30">
                    {isImg && previewSrc ? (
                      <div className="relative max-h-full max-w-full flex items-center justify-center p-2 bg-surface border border-theme shadow-md">
                        <img 
                          src={previewSrc} 
                          alt={currentPreview.name} 
                          className="max-h-[60vh] max-w-full object-contain"
                        />
                      </div>
                    ) : isDocPdf && previewSrc ? (
                      <iframe 
                        src={previewSrc} 
                        title={currentPreview.name}
                        className="w-full h-full min-h-[480px] border border-theme shadow-md bg-white"
                      />
                    ) : (
                      <div className="text-center p-8 bg-surface border border-theme-subtle max-w-md shadow-xs">
                        <FileText size={48} className="mx-auto text-muted mb-3" />
                        <h4 className="text-sm font-bold text-primary mb-1">{currentPreview.name}</h4>
                        <p className="text-xs text-muted mb-4">
                          Direct inline preview is not supported for this file type. Please open in a new tab or download the file.
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenInNewTab(currentPreview)}
                          className="mx-auto"
                        >
                          <ExternalLink size={13} className="mr-1.5" /> Open File
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-muted">
                  Select an attachment from the left to view
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-theme-subtle bg-surface2/50 shrink-0">
          <span className="text-[11px] font-mono text-muted">
            REX ERP Attachment Studio
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
