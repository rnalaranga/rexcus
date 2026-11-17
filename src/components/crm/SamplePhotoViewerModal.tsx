import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Download, Camera } from 'lucide-react';
import { resolveFileUrl } from '@/lib/utils';

interface SamplePhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: any[];
  title?: string;
}

export const SamplePhotoViewerModal: React.FC<SamplePhotoViewerModalProps> = ({
  isOpen,
  onClose,
  photos,
  title = 'Customer Sample Inspection Photos'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen || !photos || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex] || photos[0];
  const rawSrc = typeof currentPhoto === 'string' ? currentPhoto : (currentPhoto?.url || currentPhoto?.dataUrl || '');
  const currentSrc = resolveFileUrl(rawSrc);
  const currentName = typeof currentPhoto === 'string' ? `Photo ${currentIndex + 1}` : (currentPhoto?.name || `Photo ${currentIndex + 1}`);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[150] bg-white/80 dark:bg-white/75 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Top Header */}
      <div 
        className="w-full max-w-6xl flex items-center justify-between text-slate-900 shrink-0 py-2.5 px-4 rounded-xl bg-white/90 border border-slate-200/80 shadow-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600">
            <Camera size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-900">{title}</h3>
            <p className="text-[11px] text-slate-500">
              {currentName} • {currentIndex + 1} of {photos.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentSrc && (
            <a
              href={currentSrc}
              download={currentName.endsWith('.jpg') || currentName.endsWith('.png') ? currentName : `${currentName}.jpg`}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
              title="Download full image"
            >
              <Download size={16} />
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-rose-500/15 text-slate-600 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
            title="Close viewer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Image View */}
      <div 
        className="relative flex-1 w-full max-w-6xl flex items-center justify-center p-2 overflow-hidden my-3"
        onClick={e => e.stopPropagation()}
      >
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 bg-white/90 hover:bg-white text-slate-800 rounded-full border border-slate-200 shadow-lg transition-all cursor-pointer z-10"
            title="Previous Photo"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <img
          src={currentSrc}
          alt={currentName}
          className="max-h-[76vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-200/80 bg-white"
        />

        {photos.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-white/90 hover:bg-white text-slate-800 rounded-full border border-slate-200 shadow-lg transition-all cursor-pointer z-10"
            title="Next Photo"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {photos.length > 1 && (
        <div 
          className="w-full max-w-3xl flex items-center justify-center gap-2 overflow-x-auto py-2 shrink-0 custom-scrollbar"
          onClick={e => e.stopPropagation()}
        >
          {photos.map((p, idx) => {
            const thumbSrc = typeof p === 'string' ? p : (p?.url || p?.dataUrl || '');
            const thumbName = typeof p === 'string' ? `Thumb ${idx + 1}` : (p?.name || '');
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-all cursor-pointer ${
                  idx === currentIndex ? 'border-amber-400 scale-105 shadow-md' : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={thumbSrc} alt={thumbName} className="w-full h-full object-cover" />
              </button>
            );
          })}
        </div>
      )}
    </div>,
    document.body
  );
};
