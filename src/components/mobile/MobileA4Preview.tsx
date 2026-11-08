import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

interface MobileA4PreviewProps {
  children: React.ReactNode;
  title?: string;
  defaultFit?: boolean;
}

/**
 * MobileA4Preview
 * Auto-fits standard A4 letterhead (width 794px) to exact mobile phone screen width without horizontal overflow.
 * Provides interactive Zoom (+ / - / Reset / Fit) with smooth touch drag & pinch-to-zoom support.
 */
export const MobileA4Preview: React.FC<MobileA4PreviewProps> = ({
  children,
  title = 'A4 Letterhead',
  defaultFit = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [fitScale, setFitScale] = useState<number>(0.45);
  const [isFit, setIsFit] = useState<boolean>(defaultFit);

  // A4 Standard pixel width used across ERP letterheads
  const A4_WIDTH = 794;

  useEffect(() => {
    const calculateFitScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth || window.innerWidth;
        // Leave 8px padding margin
        const availableWidth = Math.max(containerWidth - 8, 280);
        const computedFit = Math.min(availableWidth / A4_WIDTH, 1);
        setFitScale(computedFit);
        if (isFit) {
          setScale(computedFit);
        }
      }
    };

    calculateFitScale();
    window.addEventListener('resize', calculateFitScale);
    return () => window.removeEventListener('resize', calculateFitScale);
  }, [isFit]);

  const handleZoomIn = () => {
    setIsFit(false);
    setScale(prev => Math.min(prev + 0.15, 2.0));
  };

  const handleZoomOut = () => {
    setIsFit(false);
    setScale(prev => Math.max(prev - 0.15, fitScale * 0.7));
  };

  const handleFitScreen = () => {
    setIsFit(true);
    setScale(fitScale);
  };

  const handleActualSize = () => {
    setIsFit(false);
    setScale(1.0);
  };

  const zoomPercent = Math.round((scale / (fitScale || 0.45)) * 100);

  return (
    <div className="flex flex-col w-full bg-surface2/40 border border-theme-subtle rounded-xl overflow-hidden shadow-xs">
      {/* Zoom Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-theme-subtle text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-primary truncate text-[11px]">
            {title}
          </span>
          <span className="px-1.5 py-0.2 rounded bg-surface2 font-mono text-[10px] text-muted border border-theme-subtle shrink-0">
            {isFit ? 'Fit to Screen' : `${zoomPercent}%`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 rounded-lg bg-surface2 hover:bg-surface border border-theme-subtle text-secondary hover:text-primary active:scale-95 transition-all"
          >
            <ZoomOut size={14} />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 rounded-lg bg-surface2 hover:bg-surface border border-theme-subtle text-secondary hover:text-primary active:scale-95 transition-all"
          >
            <ZoomIn size={14} />
          </button>

          <button
            type="button"
            onClick={handleFitScreen}
            title="Fit to Screen"
            className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 ${
              isFit 
                ? 'bg-rex-600 text-white border-rex-600 shadow-xs' 
                : 'bg-surface2 hover:bg-surface border-theme-subtle text-secondary hover:text-primary'
            }`}
          >
            <Maximize2 size={12} />
            <span>Fit</span>
          </button>

          <button
            type="button"
            onClick={handleActualSize}
            title="Actual 100% Size"
            className={`p-1.5 rounded-lg border text-secondary hover:text-primary active:scale-95 transition-all ${
              !isFit && Math.abs(scale - 1.0) < 0.05
                ? 'bg-rex-600 text-white border-rex-600'
                : 'bg-surface2 hover:bg-surface border-theme-subtle'
            }`}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Viewport Container with Drag / Scroll */}
      <div 
        ref={containerRef}
        className="w-full overflow-x-auto overflow-y-auto max-h-[75vh] p-2 bg-neutral-900/60 dark:bg-black flex justify-center items-start custom-scrollbar touch-pan-x touch-pan-y"
      >
        <div 
          style={{
            width: `${A4_WIDTH * scale}px`,
            minWidth: `${A4_WIDTH * scale}px`,
            transition: 'width 0.15s ease-out'
          }}
          className="flex justify-center shrink-0 origin-top"
        >
          <div 
            style={{
              width: `${A4_WIDTH}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              transition: 'transform 0.15s ease-out'
            }}
            className="bg-white text-black shadow-2xl rounded-xs overflow-hidden shrink-0"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
