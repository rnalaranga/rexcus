import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

interface MobileA4PreviewProps {
  children: React.ReactNode;
  title?: string;
  defaultFit?: boolean;
}

/**
 * MobileA4Preview
 * Auto-fits standard A4 letterhead (794px width) to mobile screen width with zero horizontal clipping.
 * Solves CSS transform-origin centering alignment issues by applying zoom/scale with accurate dimensional bounding.
 */
export const MobileA4Preview: React.FC<MobileA4PreviewProps> = ({
  children,
  title = 'Official Letterhead',
  defaultFit = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const A4_WIDTH = 794; // Fixed pixel width for ERP A4 documents

  const [scale, setScale] = useState<number>(0.46);
  const [fitScale, setFitScale] = useState<number>(0.46);
  const [isFit, setIsFit] = useState<boolean>(defaultFit);

  const calculateFit = useCallback(() => {
    // Determine screen/container available width safely
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
    const containerWidth = containerRef.current?.getBoundingClientRect().width || (screenWidth - 8);
    // Allow small 4px margin so borders don't touch screen edges
    const available = Math.max(containerWidth - 8, 270);
    const computed = Number((available / A4_WIDTH).toFixed(4));
    
    setFitScale(computed);
    if (isFit) {
      setScale(computed);
    }
  }, [isFit, A4_WIDTH]);

  useEffect(() => {
    calculateFit();
    // Re-check shortly after DOM render
    const timer = setTimeout(calculateFit, 60);

    const el = containerRef.current;
    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => calculateFit());
      observer.observe(el);
    }

    window.addEventListener('resize', calculateFit);
    window.addEventListener('orientationchange', calculateFit);

    return () => {
      clearTimeout(timer);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', calculateFit);
      window.removeEventListener('orientationchange', calculateFit);
    };
  }, [calculateFit]);

  const handleZoomIn = () => {
    setIsFit(false);
    setScale(prev => Math.min(Number((prev + 0.15).toFixed(2)), 2.0));
  };

  const handleZoomOut = () => {
    setIsFit(false);
    setScale(prev => Math.max(Number((prev - 0.15).toFixed(2)), Math.min(fitScale * 0.7, 0.25)));
  };

  const handleFitScreen = () => {
    setIsFit(true);
    setScale(fitScale);
  };

  const handleActualSize = () => {
    setIsFit(false);
    setScale(1.0);
  };

  const zoomPercent = Math.round((scale / (fitScale || 0.46)) * 100);

  // Scaled dimensions
  const scaledWidth = Math.round(A4_WIDTH * scale);

  return (
    <div className="flex flex-col w-full bg-neutral-900 border border-neutral-700/60 rounded-xl overflow-hidden shadow-2xl">
      {/* Zoom & Control Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-800 border-b border-neutral-700/60 text-xs shrink-0 select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-neutral-100 truncate text-[11px] max-w-[130px] sm:max-w-xs">
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
            className="p-1.5 rounded-lg bg-neutral-700/80 hover:bg-neutral-700 text-neutral-200 active:scale-95 transition-all"
          >
            <ZoomOut size={14} />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In (+)"
            className="p-1.5 rounded-lg bg-neutral-700/80 hover:bg-neutral-700 text-neutral-200 active:scale-95 transition-all"
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
                : 'bg-neutral-700/80 hover:bg-neutral-700 text-neutral-200 border-neutral-600'
            }`}
          >
            <Maximize2 size={12} />
            <span>Fit</span>
          </button>

          <button
            type="button"
            onClick={handleActualSize}
            title="100% Print Size"
            className={`p-1.5 rounded-lg border text-neutral-200 active:scale-95 transition-all ${
              !isFit && Math.abs(scale - 1.0) < 0.05
                ? 'bg-rex-600 text-white border-rex-500' 
                : 'bg-neutral-700/80 hover:bg-neutral-700 border-neutral-600'
            }`}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Viewport Canvas: Scrollable container */}
      <div 
        ref={containerRef}
        className="w-full overflow-x-auto overflow-y-auto max-h-[76vh] p-2 bg-neutral-950 custom-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/*
          Outer Wrapper:
          Uses margin: 0 auto so when scale is smaller than container width it stays perfectly centered.
          The width is strictly set to scaledWidth and overflow is visible.
        */}
        <div 
          style={{
            width: `${scaledWidth}px`,
            margin: '0 auto',
            position: 'relative'
          }}
        >
          {/*
            Inner Target:
            Fixed 794px width, scaled from top left (0 0), so it exactly fills the scaledWidth wrapper!
          */}
          <div 
            style={{
              width: `${A4_WIDTH}px`,
              minWidth: `${A4_WIDTH}px`,
              maxWidth: `${A4_WIDTH}px`,
              transform: `scale(${scale})`,
              transformOrigin: '0 0',
              backgroundColor: '#ffffff',
              color: '#000000',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)'
            }}
            className="rounded-xs overflow-hidden"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
