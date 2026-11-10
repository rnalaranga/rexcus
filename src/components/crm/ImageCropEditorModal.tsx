import React, { useState, useRef, useEffect } from 'react';
import { 
  RotateCw, RotateCcw, ZoomIn, ZoomOut, Crop, Check, X, 
  Sun, Contrast, Sliders, RefreshCw, Move, CheckCheck
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ImageCropEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  fileName?: string;
  onSave: (croppedDataUrl: string, newFileName: string) => void;
}

export const ImageCropEditorModal: React.FC<ImageCropEditorModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  fileName = 'PO_Document.jpg',
  onSave
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [isGrayscale, setIsGrayscale] = useState<boolean>(false);

  // Crop Box state: normalized 0..1 relative to viewport container
  const [isCropping, setIsCropping] = useState<boolean>(true);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 5,
    y: 5,
    w: 90,
    h: 90
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isDraggingCropRef = useRef<{ 
    mode: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'pan'; 
    startX: number; 
    startY: number; 
    initialCrop: typeof cropBox;
    initialPan: { x: number; y: number };
  } | null>(null);

  // Reset when a new image is loaded
  useEffect(() => {
    if (isOpen) {
      setRotation(0);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setBrightness(100);
      setContrast(100);
      setIsGrayscale(false);
      setIsCropping(true);
      setCropBox({ x: 5, y: 5, w: 90, h: 90 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen) return null;

  const handleRotate = (dir: 'cw' | 'ccw') => {
    setRotation(prev => (prev + (dir === 'cw' ? 90 : -90) + 360) % 360);
  };

  const handleReset = () => {
    setRotation(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setIsGrayscale(false);
    setCropBox({ x: 5, y: 5, w: 90, h: 90 });
  };

  // Mouse handlers for Crop & Pan
  const handleMouseDown = (e: React.MouseEvent, mode: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'pan') => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingCropRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initialCrop: { ...cropBox },
      initialPan: { ...pan }
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingCropRef.current || !containerRef.current) return;
      const { mode, startX, startY, initialCrop, initialPan } = isDraggingCropRef.current;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (mode === 'pan') {
        setPan({
          x: initialPan.x + deltaX,
          y: initialPan.y + deltaY
        });
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const pctDeltaX = (deltaX / rect.width) * 100;
      const pctDeltaY = (deltaY / rect.height) * 100;

      let newCrop = { ...initialCrop };

      if (mode === 'move') {
        newCrop.x = Math.max(0, Math.min(100 - initialCrop.w, initialCrop.x + pctDeltaX));
        newCrop.y = Math.max(0, Math.min(100 - initialCrop.h, initialCrop.y + pctDeltaY));
      } else if (mode === 'se') {
        newCrop.w = Math.max(10, Math.min(100 - initialCrop.x, initialCrop.w + pctDeltaX));
        newCrop.h = Math.max(10, Math.min(100 - initialCrop.y, initialCrop.h + pctDeltaY));
      } else if (mode === 'sw') {
        const targetX = Math.max(0, Math.min(initialCrop.x + initialCrop.w - 10, initialCrop.x + pctDeltaX));
        newCrop.w = initialCrop.w + (initialCrop.x - targetX);
        newCrop.x = targetX;
        newCrop.h = Math.max(10, Math.min(100 - initialCrop.y, initialCrop.h + pctDeltaY));
      } else if (mode === 'ne') {
        newCrop.w = Math.max(10, Math.min(100 - initialCrop.x, initialCrop.w + pctDeltaX));
        const targetY = Math.max(0, Math.min(initialCrop.y + initialCrop.h - 10, initialCrop.y + pctDeltaY));
        newCrop.h = initialCrop.h + (initialCrop.y - targetY);
        newCrop.y = targetY;
      } else if (mode === 'nw') {
        const targetX = Math.max(0, Math.min(initialCrop.x + initialCrop.w - 10, initialCrop.x + pctDeltaX));
        const targetY = Math.max(0, Math.min(initialCrop.y + initialCrop.h - 10, initialCrop.y + pctDeltaY));
        newCrop.w = initialCrop.w + (initialCrop.x - targetX);
        newCrop.h = initialCrop.h + (initialCrop.y - targetY);
        newCrop.x = targetX;
        newCrop.y = targetY;
      }

      setCropBox(newCrop);
    };

    const handleMouseUp = () => {
      isDraggingCropRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleApplyAndExport = () => {
    if (!imageRef.current || !containerRef.current) return;
    const img = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    // Create offscreen canvas for rendering the transformed & cropped image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate crop rectangle in screen coordinates
    const cropScreenX = containerRect.left + (cropBox.x / 100) * containerRect.width;
    const cropScreenY = containerRect.top + (cropBox.y / 100) * containerRect.height;
    const cropScreenW = (cropBox.w / 100) * containerRect.width;
    const cropScreenH = (cropBox.h / 100) * containerRect.height;

    // Output canvas size matches crop aspect with high quality
    const outputScale = Math.max(1, 1600 / Math.max(cropScreenW, cropScreenH));
    canvas.width = Math.round(cropScreenW * outputScale);
    canvas.height = Math.round(cropScreenH * outputScale);

    ctx.save();
    // Fill white background (useful for transparent pngs or margins)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)${isGrayscale ? ' grayscale(100%)' : ''}`;

    // Transform coordinate system so that the crop box top-left is at (0, 0)
    ctx.translate(-cropScreenX * outputScale, -cropScreenY * outputScale);

    // Position of the image center on screen
    const imgCenterX = imgRect.left + imgRect.width / 2;
    const imgCenterY = imgRect.top + imgRect.height / 2;

    ctx.translate(imgCenterX * outputScale, imgCenterY * outputScale);
    ctx.rotate((rotation * Math.PI) / 180);

    const isSwapped = rotation === 90 || rotation === 270;
    const renderedW = (isSwapped ? imgRect.height : imgRect.width) * outputScale;
    const renderedH = (isSwapped ? imgRect.width : imgRect.height) * outputScale;

    ctx.drawImage(img, -renderedW / 2, -renderedH / 2, renderedW, renderedH);
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const cleanBaseName = (fileName || 'Customer_PO').replace(/\.[^/.]+$/, '');
    const newName = `${cleanBaseName}_optimized.jpg`;

    onSave(croppedDataUrl, newName);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Optimize Customer PO Document (Crop, Rotate & Enhance)"
      size="xl"
      containerClassName="!z-[250]"
    >
      <div className="space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-surface2 border border-theme-subtle rounded-none text-xs select-none">
          {/* Rotate & Zoom */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleRotate('ccw')}
              className="p-1.5 bg-surface hover:bg-surface3 border border-theme-subtle text-primary rounded-none flex items-center gap-1 font-semibold"
              title="Rotate Left 90°"
            >
              <RotateCcw size={14} /> 90° Left
            </button>
            <button
              type="button"
              onClick={() => handleRotate('cw')}
              className="p-1.5 bg-surface hover:bg-surface3 border border-theme-subtle text-primary rounded-none flex items-center gap-1 font-semibold"
              title="Rotate Right 90°"
            >
              <RotateCw size={14} /> 90° Right
            </button>

            <div className="h-5 w-px bg-theme-subtle mx-1" />

            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(0.5, Number((prev - 0.2).toFixed(1))))}
              className="p-1.5 bg-surface hover:bg-surface3 border border-theme-subtle text-primary rounded-none"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="font-mono text-[11px] text-muted w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(3, Number((prev + 0.2).toFixed(1))))}
              className="p-1.5 bg-surface hover:bg-surface3 border border-theme-subtle text-primary rounded-none"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Enhancement Filters */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" title="Brightness">
              <Sun size={13} className="text-amber-500" />
              <input
                type="range"
                min="50"
                max="180"
                value={brightness}
                onChange={e => setBrightness(Number(e.target.value))}
                className="w-16 h-1 accent-amber-500 cursor-pointer"
                title={`Brightness: ${brightness}%`}
              />
            </div>
            <div className="flex items-center gap-1" title="Contrast">
              <Contrast size={13} className="text-blue-500" />
              <input
                type="range"
                min="50"
                max="200"
                value={contrast}
                onChange={e => setContrast(Number(e.target.value))}
                className="w-16 h-1 accent-blue-500 cursor-pointer"
                title={`Contrast: ${contrast}%`}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsGrayscale(prev => !prev)}
              className={`px-2 py-1 border text-[11px] font-semibold transition-colors rounded-none ${
                isGrayscale 
                  ? 'bg-zinc-800 text-white border-zinc-700' 
                  : 'bg-surface hover:bg-surface3 border-theme-subtle text-muted'
              }`}
              title="Convert Document to High-Contrast B&W / Grayscale"
            >
              B&amp;W Mode
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 bg-surface hover:bg-surface3 border border-theme-subtle text-muted hover:text-primary rounded-none"
              title="Reset All Adjustments"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Interactive Workspace Area */}
        <div
          ref={containerRef}
          onMouseDown={(e) => handleMouseDown(e, 'pan')}
          className="relative w-full h-[460px] bg-zinc-950 overflow-hidden flex items-center justify-center select-none cursor-grab active:cursor-grabbing border border-zinc-800"
        >
          {/* Transformed Image Layer */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDraggingCropRef.current ? 'none' : 'transform 0.15s ease-out'
            }}
            className="pointer-events-none select-none max-w-[90%] max-h-[90%] flex items-center justify-center"
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="PO Document"
              style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%)${isGrayscale ? ' grayscale(100%)' : ''}`
              }}
              className="max-h-[420px] max-w-[650px] object-contain shadow-2xl pointer-events-none"
            />
          </div>

          {/* Semi-transparent Dimmed Overlay Outside Crop Box */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top */}
            <div
              style={{ height: `${cropBox.y}%` }}
              className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-[1px]"
            />
            {/* Bottom */}
            <div
              style={{ top: `${cropBox.y + cropBox.h}%`, bottom: 0 }}
              className="absolute left-0 right-0 bg-black/60 backdrop-blur-[1px]"
            />
            {/* Left */}
            <div
              style={{ top: `${cropBox.y}%`, height: `${cropBox.h}%`, width: `${cropBox.x}%` }}
              className="absolute left-0 bg-black/60 backdrop-blur-[1px]"
            />
            {/* Right */}
            <div
              style={{ top: `${cropBox.y}%`, height: `${cropBox.h}%`, left: `${cropBox.x + cropBox.w}%`, right: 0 }}
              className="absolute bg-black/60 backdrop-blur-[1px]"
            />
          </div>

          {/* Interactive Crop Frame Box */}
          <div
            style={{
              left: `${cropBox.x}%`,
              top: `${cropBox.y}%`,
              width: `${cropBox.w}%`,
              height: `${cropBox.h}%`
            }}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
            className="absolute border-2 border-emerald-400 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] cursor-move z-20 group"
          >
            {/* Rule of Thirds Grid Lines */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-40">
              <div className="border-r border-b border-emerald-300/40" />
              <div className="border-r border-b border-emerald-300/40" />
              <div className="border-b border-emerald-300/40" />
              <div className="border-r border-b border-emerald-300/40" />
              <div className="border-r border-b border-emerald-300/40" />
              <div className="border-b border-emerald-300/40" />
              <div className="border-r border-emerald-300/40" />
              <div className="border-r border-emerald-300/40" />
              <div />
            </div>

            {/* Corner Resize Handles */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'nw')}
              className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-emerald-400 border border-black cursor-nwse-resize z-30"
            />
            <div
              onMouseDown={(e) => handleMouseDown(e, 'ne')}
              className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-400 border border-black cursor-nesw-resize z-30"
            />
            <div
              onMouseDown={(e) => handleMouseDown(e, 'se')}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-400 border border-black cursor-nwse-resize z-30"
            />
            <div
              onMouseDown={(e) => handleMouseDown(e, 'sw')}
              className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-emerald-400 border border-black cursor-nesw-resize z-30"
            />

            {/* Center Hint */}
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/75 text-[10px] font-mono text-emerald-300 pointer-events-none rounded-none border border-emerald-500/30">
              Drag box to position / Drag corners to resize
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-theme-subtle">
          <div className="text-[11px] text-muted flex items-center gap-1.5">
            <Crop size={14} className="text-emerald-500" />
            <span>Crop bounds will be extracted at sharp resolution with selected enhancements.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={CheckCheck}
              onClick={handleApplyAndExport}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Apply Crop &amp; Attach
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
