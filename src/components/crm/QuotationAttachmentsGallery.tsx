import React, { useState } from 'react';
import { 
  Paperclip, FileText, Image as ImageIcon, Eye, Download, 
  ExternalLink, X, Maximize2, FileCheck, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface QuotationAttachmentItem {
  id: string | number;
  name: string;
  type?: string;
  dataUrl?: string;
  url?: string;
  source?: string; // e.g. 'Quotation Specification' or 'Part #1 - Flange'
  bomTitle?: string;
}

interface QuotationAttachmentsGalleryProps {
  attachments: QuotationAttachmentItem[];
  title?: string;
  className?: string;
  compact?: boolean;
}

export const QuotationAttachmentsGallery: React.FC<QuotationAttachmentsGalleryProps> = ({
  attachments = [],
  title = 'Quotation Attachments & Technical Drawings',
  className = '',
  compact = false
}) => {
  const [activePreview, setActivePreview] = useState<QuotationAttachmentItem | null>(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const isImage = (att: QuotationAttachmentItem) => {
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

  const isPdf = (att: QuotationAttachmentItem) => {
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

  const handleOpenInNewTab = (att: QuotationAttachmentItem) => {
    const src = att.dataUrl || att.url;
    if (!src) return;
    try {
      if (src.startsWith('data:')) {
        const parts = src.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(src, '_blank');
      }
    } catch (e) {
      console.error('Error opening attachment:', e);
      window.open(src, '_blank');
    }
  };

  const handleDownload = (att: QuotationAttachmentItem) => {
    const src = att.dataUrl || att.url;
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = att.name || 'quotation_attachment';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-theme-subtle">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Paperclip size={14} />
          </div>
          <div>
            <span className="text-xs font-bold text-primary tracking-tight">
              {title}
            </span>
            <span className="ml-2 text-[10px] font-mono font-semibold px-1.5 py-0.2 bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
              {attachments.length} {attachments.length === 1 ? 'File' : 'Files'}
            </span>
          </div>
        </div>
        <span className="text-[10px] text-muted font-mono">
          Click any file to preview / open
        </span>
      </div>

      {/* Attachments Cards Grid */}
      <div className={`grid gap-2.5 ${compact ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {attachments.map((att, idx) => {
          const isImg = isImage(att);
          const isDocPdf = isPdf(att);
          const src = att.dataUrl || att.url;

          return (
            <div
              key={att.id || idx}
              onClick={() => setActivePreview(att)}
              className="group relative flex items-center gap-3 p-2.5 bg-surface2/50 hover:bg-surface2 border border-theme-subtle hover:border-blue-500/40 transition-all cursor-pointer shadow-2xs"
            >
              {/* Thumbnail / Icon preview */}
              <div className="w-12 h-12 shrink-0 bg-surface border border-theme-subtle overflow-hidden flex items-center justify-center relative">
                {isImg && src ? (
                  <img
                    src={src}
                    alt={att.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : isDocPdf ? (
                  <div className="flex flex-col items-center justify-center text-rose-500">
                    <FileText size={20} />
                    <span className="text-[8px] font-mono font-bold uppercase mt-0.5">PDF</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-amber-500">
                    <Paperclip size={18} />
                    <span className="text-[8px] font-mono font-bold uppercase mt-0.5">FILE</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <Eye size={16} />
                </div>
              </div>

              {/* File Info */}
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-primary block truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={att.name}>
                  {att.name || `Attachment #${idx + 1}`}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[9px] font-mono font-semibold px-1 py-0.2 border uppercase ${
                    isDocPdf 
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                      : isImg 
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
                        : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                  }`}>
                    {isDocPdf ? 'PDF Drawing' : isImg ? 'Image / Drawing' : 'Document'}
                  </span>
                  {att.source && (
                    <span className="text-[9px] font-mono text-muted truncate max-w-[130px]" title={att.source}>
                      {att.source}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => handleOpenInNewTab(att)}
                  className="p-1.5 text-muted hover:text-blue-600 hover:bg-blue-500/10 transition-colors"
                  title="Open in new window"
                >
                  <ExternalLink size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(att)}
                  className="p-1.5 text-muted hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                  title="Download file"
                >
                  <Download size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Preview Modal for Images & PDFs */}
      {activePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-between p-4 animate-in fade-in duration-150"
          onClick={() => setActivePreview(null)}
        >
          {/* Modal Header */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white shrink-0 py-2 border-b border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                <Paperclip size={16} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold tracking-tight text-white truncate max-w-lg">
                  {activePreview.name || 'Quotation Attachment'}
                </h3>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {activePreview.source || 'Quotation Technical Document'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenInNewTab(activePreview)}
                className="text-xs text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-1.5 h-8 px-2.5"
              >
                <ExternalLink size={13} /> New Tab
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(activePreview)}
                className="text-xs text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-1.5 h-8 px-2.5"
              >
                <Download size={13} /> Download
              </Button>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer ml-2"
                title="Close viewer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Content Body */}
          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center p-2 overflow-hidden my-2"
            onClick={e => e.stopPropagation()}
          >
            {isImage(activePreview) ? (
              <img
                src={activePreview.dataUrl || activePreview.url}
                alt={activePreview.name}
                className="max-h-[78vh] max-w-full object-contain shadow-2xl border border-white/10"
              />
            ) : isPdf(activePreview) ? (
              <iframe
                src={activePreview.dataUrl || activePreview.url}
                title={activePreview.name}
                className="w-full h-[78vh] border border-white/10 bg-white"
              />
            ) : (
              <div className="p-8 text-center bg-zinc-900 border border-white/10 max-w-md">
                <Paperclip size={40} className="mx-auto text-amber-400 mb-3" />
                <h4 className="text-base font-bold text-white mb-1">{activePreview.name}</h4>
                <p className="text-xs text-zinc-400 mb-4">
                  This document cannot be previewed inline. Please download or open it in your browser.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleDownload(activePreview)}
                  className="mx-auto flex items-center gap-1.5"
                >
                  <Download size={14} /> Download File
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
