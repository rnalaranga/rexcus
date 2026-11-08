import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Move } from 'lucide-react';

interface MobileA4PreviewProps {
  children: React.ReactNode;
  title?: string;
  defaultFit?: boolean;
}

/**
 * MobileA4Preview
 * Auto-fits standard A4 letterhead (794px width) to mobile screen width with zero horizontal clipping.
 * Features:
 * - Dynamic container width measurement using ResizeObserver
 * - Robust CSS zoom & transform scaling for crisp font and vector rendering
 * - Zoom controls (+ / - / Fit / 100%)
 * - Touch-friendly pan and drag
 */
export const MobileA4Preview: React.FC<MobileA4PreviewProps> = ({
  children,
  title = 'Official Letterhead',
  defaultFit = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const A4_WIDTH = 794; // Fixed pixel width used across ERP letterhead templates

  const [scale, setScale] = useState<number>(0.48);
  const [fitScale, setFitScale] = useState<number>(0.48);
  const [isFit, setIsFit] = useState<boolean>(defaultFit);

  const updateFitScale = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth || window.innerWidth;
    // Account for 12px outer padding (6px on each side)
    const availableWidth = Math.max(containerWidth - 12, 280);
    const computed = Number((availableWidth / A4_WIDTH).toFixed(4));
    setFitScale(computed);
    if (isFit) {
      setScale(computed);
    }
  }, [isFit, A4_WIDTH]);

  useEffect(() => {
    updateFitScale();
    // Run after DOM paint
    const t = setTimeout(updateFitScale, 50);

    const el = containerRef.current;
    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateFitScale();
      });
      observer.observe(el);
    }

    window.addEventListener('resize', updateFitScale);
    window.addEventListener('orientationchange', updateFitScale);

    return () => {
      clearTimeout(t);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateFitScale);
      window.removeEventListener('orientationchange', updateFitScale);
    };
  }, [updateFitScale]);

  const handleZoomIn = () => {
    setIsFit(false);
    setScale(prev => Math.min(Number((prev + 0.12).toFixed(2)), 2.0));
  };

  const handleZoomOut = () => {
    setIsFit(false);
    setScale(prev => Math.max(Number((prev - 0.12).toFixed(2)), Math.min(fitScale * 0.6, 0.25)));
  };

  const handleFitScreen = () => {
    setIsFit(true);
    setScale(fitScale);
  };

  const handleActualSize = () => {
    setIsFit(false);
    setScale(1.0);
  };

  const zoomPercent = Math.round((scale / (fitScale || 0.48)) * 100);

  return (
    <div className="flex flex-col w-full bg-neutral-900 border border-neutral-700/60 rounded-xl overflow-hidden shadow-xl">
      {/* Zoom & Control Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-800 border-b border-neutral-700/60 text-xs shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-neutral-100 truncate text-[11px] max-w-[140px] sm:max-w-xs">
            {title}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-neutral-900 font-mono text-[10px] text-neutral-300 border border-neutral-700 shrink-0">
            {isFit ? 'Fit (100% W)' : `${zoomPercent}%`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            className="p-1.5 rounded-lg bg-neutral-700/70 hover:bg-neutral-700 text-neutral-200 active:scale-95 transition-all"
          >
            <ZoomOut size={14} />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In (+)"
            className="p-1.5 rounded-lg bg-neutral-700/70 hover:bg-neutral-700 text-neutral-200 active:scale-95 transition-all"
          >
            <ZoomIn size={14} />
          </button>

          <button
            type="button"
            onClick={handleFitScreen}
            title="Fit to Screen Width"
            className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 ${
              isFit 
                ? 'bg-rex-600 text-white border-rex-500 shadow-sm' 
                : 'bg-neutral-700/70 hover:bg-neutral-700 text-neutral-200 border-neutral-600'
            }`}
          >
            <Maximize2 size={12} />
            <span>Fit</span>
          </button>

          <button
            type="button"
            onClick={handleActualSize}
            title="100% Real Print Size"
            className={`p-1.5 rounded-lg border text-neutral-200 active:scale-95 transition-all ${
              !isFit && Math.abs(scale - 1.0) < 0.05
                ? 'bg-rex-600 text-white border-rex-500' 
                : 'bg-neutral-700/70 hover:bg-neutral-700 border-neutral-600'
            }`}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Helper hint for mobile users */}
      <div className="px-3 py-1 bg-neutral-950/80 border-b border-neutral-800 text-[10px] text-neutral-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Move size={10} className="text-rex-400" />
          <span>Pan/scroll vertically or horizontally to inspect</span>
        </span>
        <span className="font-mono text-[9px] text-neutral-400">A4 • 794px</span>
      </div>

      {/* Viewport Canvas: Fully Scrollable & Scaled */}
      <div 
        ref={containerRef}
        className="w-full overflow-x-auto overflow-y-auto max-h-[72vh] p-2 bg-neutral-950 flex justify-center items-start custom-scrollbar touch-pan-x touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div 
          style={{
            width: `${Math.round(A4_WIDTH * scale)}px`,
            minWidth: `${Math.round(A4_WIDTH * scale)}px`,
            transition: 'width 0.12s ease-out'
          }}
          className="flex justify-center shrink-0 origin-top"
        >
          <div 
            style={{
              width: `${A4_WIDTH}px`,
              minWidth: `${A4_WIDTH}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              transition: 'transform 0.12s ease-out'
            }}
            className="bg-white text-black shadow-2xl rounded-xs overflow-hidden shrink-0 border border-neutral-300"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
