import React, { useEffect, useState } from 'react';
import { useNavLoading } from '@/contexts/NavLoadingContext';
import { Loader2, Zap } from 'lucide-react';

export const RouteTransitionLoader: React.FC = () => {
  const { isNavigating } = useNavLoading();
  const [showSpinner, setShowSpinner] = useState(false);

  // If loading takes more than 150ms, show a sleek centered notification pill
  useEffect(() => {
    let timer: any = null;
    if (isNavigating) {
      timer = setTimeout(() => {
        setShowSpinner(true);
      }, 150);
    } else {
      setShowSpinner(false);
    }
    return () => clearTimeout(timer);
  }, [isNavigating]);

  if (!isNavigating) return null;

  return (
    <>
      {/* 1. Ultra-responsive Top Progress Bar (YouTube / GitHub style) */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[99999] overflow-hidden pointer-events-none">
        <div className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-400 animate-[progress_1.2s_ease-in-out_infinite] shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
      </div>

      {/* 2. Sleek Floating Indicator if loading takes noticeable time */}
      {showSpinner && (
        <div className="fixed top-4 right-6 z-[99999] pointer-events-none animate-fade-in">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-900/90 dark:bg-zinc-950/95 border border-amber-500/30 text-amber-400 shadow-2xl backdrop-blur-md">
            <Loader2 size={13} className="animate-spin text-amber-500" />
            <span className="text-[11px] font-bold tracking-wide uppercase font-mono text-zinc-200">
              Loading Page...
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
          </div>
        </div>
      )}
    </>
  );
};
